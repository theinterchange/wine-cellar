import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wineRecommendations, friendships, wines, users } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

// GET /api/friends/recommend — list received recommendations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const recs = await db
    .select({
      id: wineRecommendations.id,
      message: wineRecommendations.message,
      readAt: wineRecommendations.readAt,
      createdAt: wineRecommendations.createdAt,
      fromUserName: sql<string>`(SELECT name FROM users WHERE id = ${wineRecommendations.fromUserId})`,
      wineId: wines.id,
      brand: wines.brand,
      varietal: wines.varietal,
      vintage: wines.vintage,
      region: wines.region,
      imageUrl: wines.imageUrl,
      estimatedRating: wines.estimatedRating,
      designation: wines.designation,
      marketPrice: wines.marketPrice,
    })
    .from(wineRecommendations)
    .innerJoin(wines, eq(wineRecommendations.wineId, wines.id))
    .where(eq(wineRecommendations.toUserId, userId))
    .orderBy(sql`${wineRecommendations.createdAt} desc`);

  // Mark unread as read
  const unreadIds = recs.filter((r) => !r.readAt).map((r) => r.id);
  if (unreadIds.length > 0) {
    for (const rid of unreadIds) {
      await db
        .update(wineRecommendations)
        .set({ readAt: new Date().toISOString() })
        .where(eq(wineRecommendations.id, rid));
    }
  }

  return NextResponse.json(recs);
}

// POST /api/friends/recommend — send a wine recommendation
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { toUserId, wineId, message } = await req.json();

  if (!toUserId || !wineId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify friendship
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, toUserId)),
          and(eq(friendships.requesterId, toUserId), eq(friendships.addresseeId, userId))
        ),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);

  if (!friendship) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  // Verify wine exists and belongs to user
  const [wine] = await db.select().from(wines).where(eq(wines.id, wineId)).limit(1);
  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  await db.insert(wineRecommendations).values({
    fromUserId: userId,
    toUserId,
    wineId,
    message: message || null,
  });

  return NextResponse.json({ success: true });
}
