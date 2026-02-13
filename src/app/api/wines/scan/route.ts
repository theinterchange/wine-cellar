import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeWineLabel } from "@/lib/openai";
import { enrichWineData } from "@/lib/wine-enrichment";
import { lookupMarketPrice } from "@/lib/wine-pricing";
import { db } from "@/lib/db";
import { wines } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Analyze label
    const labelData = await analyzeWineLabel(base64);

    // Check for existing wine with same brand + varietal + vintage (case-insensitive brand)
    const userId = parseInt(session.user.id);
    const conditions = [
      sql`lower(${wines.brand}) = lower(${labelData.brand})`,
      eq(wines.createdBy, userId),
    ];
    if (labelData.varietal) {
      conditions.push(sql`lower(${wines.varietal}) = lower(${labelData.varietal})`);
    } else {
      conditions.push(sql`${wines.varietal} is null`);
    }
    if (labelData.vintage) {
      conditions.push(eq(wines.vintage, labelData.vintage));
    } else {
      conditions.push(sql`${wines.vintage} is null`);
    }

    const [existing] = await db
      .select()
      .from(wines)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      // Backfill food pairings for wines created before that column existed
      let foodPairings = existing.foodPairings;
      if (foodPairings === null) {
        const enrichment = await enrichWineData({
          brand: existing.brand,
          varietal: existing.varietal,
          vintage: existing.vintage,
          region: existing.region,
          designation: existing.designation,
        });
        foodPairings = enrichment.foodPairings;
        await db
          .update(wines)
          .set({ foodPairings })
          .where(eq(wines.id, existing.id));
      }

      return NextResponse.json({
        id: existing.id,
        brand: existing.brand,
        varietal: existing.varietal,
        vintage: existing.vintage,
        region: existing.region,
        imageUrl: existing.imageUrl,
        drinkWindowStart: existing.drinkWindowStart,
        drinkWindowEnd: existing.drinkWindowEnd,
        estimatedRating: existing.estimatedRating,
        ratingNotes: existing.ratingNotes,
        designation: existing.designation,
        foodPairings,
        marketPrice: existing.marketPrice,
      });
    }

    // Enrich with drinking window and rating, and look up market price
    const [enrichment, pricing] = await Promise.all([
      enrichWineData(labelData),
      lookupMarketPrice(labelData),
    ]);

    // Upload image to Vercel Blob
    const filename = `wine-${Date.now()}.jpg`;
    const blob = await put(filename, Buffer.from(base64, "base64"), {
      access: "public",
      contentType: "image/jpeg",
    });

    // Save wine to database
    const [result] = await db
      .insert(wines)
      .values({
        brand: labelData.brand,
        varietal: labelData.varietal,
        vintage: labelData.vintage,
        region: labelData.region,
        imageUrl: blob.url,
        drinkWindowStart: enrichment.drinkWindowStart,
        drinkWindowEnd: enrichment.drinkWindowEnd,
        estimatedRating: enrichment.estimatedRating,
        ratingNotes: enrichment.ratingNotes,
        designation: labelData.designation,
        foodPairings: enrichment.foodPairings,
        marketPrice: pricing.marketPrice,
        createdBy: userId,
      })
      .returning({ id: wines.id });

    return NextResponse.json({
      id: result.id,
      ...labelData,
      ...enrichment,
      ...pricing,
      imageUrl: blob.url,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Failed to analyze wine label" },
      { status: 500 }
    );
  }
}
