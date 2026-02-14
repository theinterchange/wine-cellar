import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumed, inventory, wines } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: consumed.id,
      rating: consumed.rating,
      notes: consumed.notes,
      consumedAt: consumed.consumedAt,
      wine: {
        id: wines.id,
        brand: wines.brand,
        varietal: wines.varietal,
        vintage: wines.vintage,
        region: wines.region,
        imageUrl: wines.imageUrl,
        drinkWindowStart: wines.drinkWindowStart,
        drinkWindowEnd: wines.drinkWindowEnd,
        estimatedRating: wines.estimatedRating,
        ratingNotes: wines.ratingNotes,
        foodPairings: wines.foodPairings,
        designation: wines.designation,
      },
    })
    .from(consumed)
    .innerJoin(wines, eq(consumed.wineId, wines.id))
    .where(eq(consumed.userId, parseInt(session.user.id)));

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { wineId, inventoryId } = await req.json();

  if (!wineId) {
    return NextResponse.json({ error: "wineId is required" }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  // Create consumed record
  const [record] = await db
    .insert(consumed)
    .values({ userId, wineId })
    .returning({ id: consumed.id, consumedAt: consumed.consumedAt });

  // Decrement inventory if inventoryId provided
  if (inventoryId) {
    const [entry] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.id, inventoryId), eq(inventory.userId, userId)))
      .limit(1);

    if (entry) {
      if (entry.quantity <= 1) {
        await db.delete(inventory)
          .where(and(eq(inventory.id, inventoryId), eq(inventory.userId, userId)));
      } else {
        await db.update(inventory)
          .set({ quantity: entry.quantity - 1 })
          .where(and(eq(inventory.id, inventoryId), eq(inventory.userId, userId)));
      }
    }
  }

  return NextResponse.json(record, { status: 201 });
}
