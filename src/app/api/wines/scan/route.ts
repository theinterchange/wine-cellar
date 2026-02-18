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
    const { image, mergeWith } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Analyze label
    const labelData = await analyzeWineLabel(base64);

    const userId = parseInt(session.user.id);

    // Merge mode: fill null fields on existing wine from back label scan
    if (mergeWith) {
      const wineCondition = and(eq(wines.id, mergeWith), eq(wines.createdBy, userId));
      const [existing] = await db.select().from(wines).where(wineCondition).limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Wine not found" }, { status: 404 });
      }

      // Only fill in fields that are currently null on the existing wine
      const mergeUpdate: Record<string, unknown> = {};
      if (!existing.varietal && labelData.varietal) mergeUpdate.varietal = labelData.varietal;
      if (!existing.vintage && labelData.vintage) mergeUpdate.vintage = labelData.vintage;
      if (!existing.region && labelData.region) mergeUpdate.region = labelData.region;
      if (!existing.designation && labelData.designation) mergeUpdate.designation = labelData.designation;

      if (Object.keys(mergeUpdate).length > 0) {
        await db.update(wines).set(mergeUpdate).where(wineCondition);
      }

      // Re-enrich with merged data
      const [merged] = await db.select().from(wines).where(wineCondition).limit(1);
      const [enrichment, pricing] = await Promise.all([
        enrichWineData({
          brand: merged.brand,
          varietal: merged.varietal,
          vintage: merged.vintage,
          region: merged.region,
          designation: merged.designation,
        }),
        lookupMarketPrice({
          brand: merged.brand,
          varietal: merged.varietal,
          vintage: merged.vintage,
          region: merged.region,
        }),
      ]);

      const enrichUpdate: Record<string, unknown> = {
        drinkWindowStart: enrichment.drinkWindowStart,
        drinkWindowEnd: enrichment.drinkWindowEnd,
        estimatedRating: enrichment.estimatedRating,
        ratingNotes: enrichment.ratingNotes,
        marketPrice: pricing.marketPrice,
      };
      if (!merged.varietal && enrichment.varietal) enrichUpdate.varietal = enrichment.varietal;
      if (!merged.foodPairings) enrichUpdate.foodPairings = enrichment.foodPairings;

      await db.update(wines).set(enrichUpdate).where(wineCondition);
      const [final] = await db.select().from(wines).where(wineCondition).limit(1);
      return NextResponse.json(final);
    }

    // Check for existing wine with same brand + varietal + vintage (case-insensitive brand)
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

    // Use enrichment varietal if label didn't have one
    const finalVarietal = labelData.varietal || enrichment.varietal;

    // Save wine to database
    const [result] = await db
      .insert(wines)
      .values({
        brand: labelData.brand,
        varietal: finalVarietal,
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
      brand: labelData.brand,
      varietal: finalVarietal,
      vintage: labelData.vintage,
      region: labelData.region,
      designation: labelData.designation,
      drinkWindowStart: enrichment.drinkWindowStart,
      drinkWindowEnd: enrichment.drinkWindowEnd,
      estimatedRating: enrichment.estimatedRating,
      ratingNotes: enrichment.ratingNotes,
      foodPairings: enrichment.foodPairings,
      marketPrice: pricing.marketPrice,
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
