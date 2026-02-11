import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inventory, wines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: inventory.id,
      quantity: inventory.quantity,
      purchaseDate: inventory.purchaseDate,
      purchasePrice: inventory.purchasePrice,
      notes: inventory.notes,
      addedAt: inventory.addedAt,
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
      },
    })
    .from(inventory)
    .innerJoin(wines, eq(inventory.wineId, wines.id))
    .where(eq(inventory.userId, parseInt(session.user.id)));

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { wineId, quantity, purchaseDate, purchasePrice, notes } = await req.json();

  if (!wineId) {
    return NextResponse.json({ error: "wineId is required" }, { status: 400 });
  }

  const [result] = await db
    .insert(inventory)
    .values({
      userId: parseInt(session.user.id),
      wineId,
      quantity: quantity || 1,
      purchaseDate,
      purchasePrice,
      notes,
    })
    .returning({ id: inventory.id });

  return NextResponse.json({ id: result.id }, { status: 201 });
}
