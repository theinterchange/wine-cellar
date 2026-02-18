import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wines } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { enrichWineData } from "@/lib/wine-enrichment";
import { lookupMarketPrice } from "@/lib/wine-pricing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [wine] = await db
    .select()
    .from(wines)
    .where(and(eq(wines.id, parseInt(id)), eq(wines.createdBy, parseInt(session.user.id))))
    .limit(1);

  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  return NextResponse.json(wine);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const { rescore, ...fields } = body;
  const update: Record<string, unknown> = {};
  if (fields.brand !== undefined) update.brand = fields.brand;
  if (fields.varietal !== undefined) update.varietal = fields.varietal;
  if (fields.vintage !== undefined) update.vintage = fields.vintage;
  if (fields.region !== undefined) update.region = fields.region;
  if (fields.designation !== undefined) update.designation = fields.designation;
  if (fields.foodPairings !== undefined) update.foodPairings = fields.foodPairings;
  if (fields.marketPrice !== undefined) update.marketPrice = fields.marketPrice;

  if (Object.keys(update).length === 0 && !rescore) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const wineCondition = and(eq(wines.id, parseInt(id)), eq(wines.createdBy, parseInt(session.user.id)));

  if (Object.keys(update).length > 0) {
    await db.update(wines).set(update).where(wineCondition);
  }

  if (rescore) {
    // Fetch the current wine to get all fields for enrichment
    const [current] = await db.select().from(wines).where(wineCondition).limit(1);
    if (!current) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    const [enrichment, pricing] = await Promise.all([
      enrichWineData({
        brand: current.brand,
        varietal: current.varietal,
        vintage: current.vintage,
        region: current.region,
        designation: current.designation,
      }),
      lookupMarketPrice({
        brand: current.brand,
        varietal: current.varietal,
        vintage: current.vintage,
        region: current.region,
      }),
    ]);

    const rescoreUpdate: Record<string, unknown> = {
      drinkWindowStart: enrichment.drinkWindowStart,
      drinkWindowEnd: enrichment.drinkWindowEnd,
      estimatedRating: enrichment.estimatedRating,
      ratingNotes: enrichment.ratingNotes,
      marketPrice: pricing.marketPrice,
    };
    // Only use AI food pairings if the user didn't submit their own and none exist
    if (fields.foodPairings === undefined && !current.foodPairings) {
      rescoreUpdate.foodPairings = enrichment.foodPairings;
    }
    // Backfill varietal from enrichment if wine has none
    if (!current.varietal && enrichment.varietal) {
      rescoreUpdate.varietal = enrichment.varietal;
    }
    await db.update(wines).set(rescoreUpdate).where(wineCondition);
  }

  // Return full updated wine
  const [updated] = await db.select().from(wines).where(wineCondition).limit(1);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(wines)
    .where(and(eq(wines.id, parseInt(id)), eq(wines.createdBy, parseInt(session.user.id))));

  return NextResponse.json({ success: true });
}
