import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlist, wines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: wishlist.id,
      priority: wishlist.priority,
      notes: wishlist.notes,
      addedAt: wishlist.addedAt,
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
    .from(wishlist)
    .innerJoin(wines, eq(wishlist.wineId, wines.id))
    .where(eq(wishlist.userId, parseInt(session.user.id)));

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { wineId, priority, notes } = await req.json();

  if (!wineId) {
    return NextResponse.json({ error: "wineId is required" }, { status: 400 });
  }

  const [result] = await db
    .insert(wishlist)
    .values({
      userId: parseInt(session.user.id),
      wineId,
      priority: priority || 3,
      notes,
    })
    .returning({ id: wishlist.id });

  return NextResponse.json({ id: result.id }, { status: 201 });
}
