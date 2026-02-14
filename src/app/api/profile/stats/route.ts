import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inventory, consumed, wines } from "@/lib/db/schema";
import { eq, sql, desc, asc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  // Cellar stats
  const cellarRows = await db
    .select({
      totalBottles: sql<number>`coalesce(sum(${inventory.quantity}), 0)`,
      totalWines: sql<number>`count(*)`,
    })
    .from(inventory)
    .where(eq(inventory.userId, userId));

  const cellarVarietals = await db
    .select({ varietal: wines.varietal, count: sql<number>`count(*)` })
    .from(inventory)
    .innerJoin(wines, eq(inventory.wineId, wines.id))
    .where(eq(inventory.userId, userId))
    .groupBy(wines.varietal);

  // Consumed stats
  const consumedRows = await db
    .select({
      totalConsumed: sql<number>`count(*)`,
      averageRating: sql<number>`coalesce(avg(${consumed.rating}), 0)`,
    })
    .from(consumed)
    .where(eq(consumed.userId, userId));

  const consumedVarietals = await db
    .select({ varietal: wines.varietal, count: sql<number>`count(*)` })
    .from(consumed)
    .innerJoin(wines, eq(consumed.wineId, wines.id))
    .where(eq(consumed.userId, userId))
    .groupBy(wines.varietal);

  const totalConsumed = consumedRows[0]?.totalConsumed ?? 0;

  // Milestones
  const milestones = [
    { key: "first-sip", label: "First Sip", description: "Consume your first wine", threshold: 1, achieved: totalConsumed >= 1 },
    { key: "five-deep", label: "5 Bottles Deep", description: "Consume 5 wines", threshold: 5, achieved: totalConsumed >= 5 },
    { key: "dozen-club", label: "Dozen Club", description: "Consume 12 wines", threshold: 12, achieved: totalConsumed >= 12 },
    { key: "quarter-case", label: "Quarter Century", description: "Consume 25 wines", threshold: 25, achieved: totalConsumed >= 25 },
    { key: "half-century", label: "Half Century", description: "Consume 50 wines", threshold: 50, achieved: totalConsumed >= 50 },
  ];

  // Per-varietal milestones (5 consumed of a single varietal)
  for (const v of consumedVarietals) {
    if (v.varietal && v.count >= 5) {
      milestones.push({
        key: `varietal-${v.varietal}`,
        label: `${v.varietal} Lover`,
        description: `Consume 5 ${v.varietal} wines`,
        threshold: 5,
        achieved: true,
      });
    }
  }

  // Average personal rating by varietal (only rated wines)
  const avgRatingByVarietal = await db
    .select({
      varietal: wines.varietal,
      avgRating: sql<number>`round(avg(${consumed.rating}), 1)`,
      count: sql<number>`count(*)`,
    })
    .from(consumed)
    .innerJoin(wines, eq(consumed.wineId, wines.id))
    .where(sql`${consumed.userId} = ${userId} AND ${consumed.rating} IS NOT NULL AND ${wines.varietal} IS NOT NULL`)
    .groupBy(wines.varietal)
    .orderBy(desc(sql`avg(${consumed.rating})`));

  // Vintage breakdown in cellar
  const vintageBreakdown = await db
    .select({
      vintage: wines.vintage,
      count: sql<number>`sum(${inventory.quantity})`,
    })
    .from(inventory)
    .innerJoin(wines, eq(inventory.wineId, wines.id))
    .where(sql`${inventory.userId} = ${userId} AND ${wines.vintage} IS NOT NULL`)
    .groupBy(wines.vintage)
    .orderBy(asc(wines.vintage));

  // Top 3 consumed wines by personal rating
  const topRated = await db
    .select({
      brand: wines.brand,
      varietal: wines.varietal,
      vintage: wines.vintage,
      rating: consumed.rating,
    })
    .from(consumed)
    .innerJoin(wines, eq(consumed.wineId, wines.id))
    .where(sql`${consumed.userId} = ${userId} AND ${consumed.rating} IS NOT NULL`)
    .orderBy(desc(consumed.rating))
    .limit(3);

  // Oldest bottle in cellar
  const oldestBottle = await db
    .select({
      brand: wines.brand,
      varietal: wines.varietal,
      vintage: wines.vintage,
    })
    .from(inventory)
    .innerJoin(wines, eq(inventory.wineId, wines.id))
    .where(sql`${inventory.userId} = ${userId} AND ${wines.vintage} IS NOT NULL`)
    .orderBy(asc(wines.vintage))
    .limit(1);

  // Total value of cellar
  const totalValueRows = await db
    .select({
      total: sql<number>`coalesce(sum(${inventory.purchasePrice} * ${inventory.quantity}), 0)`,
    })
    .from(inventory)
    .where(sql`${inventory.userId} = ${userId} AND ${inventory.purchasePrice} IS NOT NULL`);

  const totalValue = totalValueRows[0]?.total || null;

  return NextResponse.json({
    cellar: {
      totalBottles: cellarRows[0]?.totalBottles ?? 0,
      totalWines: cellarRows[0]?.totalWines ?? 0,
      varietalBreakdown: cellarVarietals.filter((v) => v.varietal),
      vintageBreakdown: vintageBreakdown.filter((v) => v.vintage),
      oldestVintage: oldestBottle[0] ?? null,
      totalValue,
    },
    consumed: {
      totalConsumed,
      averageRating: Math.round(consumedRows[0]?.averageRating ?? 0),
      consumedByVarietal: consumedVarietals.filter((v) => v.varietal),
      avgRatingByVarietal: avgRatingByVarietal.filter((v) => v.varietal),
      topRated,
    },
    milestones,
  });
}
