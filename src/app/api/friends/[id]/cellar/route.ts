import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cellarShares, inventory, wines, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/friends/[id]/cellar — view friend's shared cellar (read-only)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = await params;
  const friendId = parseInt(id);

  // Check that friend has shared their cellar with us
  const [share] = await db
    .select()
    .from(cellarShares)
    .where(
      and(
        eq(cellarShares.ownerId, friendId),
        eq(cellarShares.friendId, userId),
        sql`${cellarShares.revokedAt} is null`
      )
    )
    .limit(1);

  if (!share) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get friend's name
  const [friend] = await db.select({ name: users.name }).from(users).where(eq(users.id, friendId)).limit(1);

  // Get friend's cellar — wine details only, no private metadata
  const items = await db
    .select({
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
      designation: wines.designation,
      foodPairings: wines.foodPairings,
      marketPrice: wines.marketPrice,
      quantity: inventory.quantity,
    })
    .from(inventory)
    .innerJoin(wines, eq(inventory.wineId, wines.id))
    .where(eq(inventory.userId, friendId));

  return NextResponse.json({
    friendName: friend?.name || "Friend",
    wines: items,
  });
}
