import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cellarShares, friendships } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

// POST /api/friends/share — grant cellar access to a friend
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { friendId } = await req.json();

  // Verify friendship exists and is accepted
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
        ),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);

  if (!friendship) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  // Check if active share already exists
  const [existing] = await db
    .select()
    .from(cellarShares)
    .where(
      and(
        eq(cellarShares.ownerId, userId),
        eq(cellarShares.friendId, friendId),
        sql`${cellarShares.revokedAt} is null`
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ shared: true });
  }

  await db.insert(cellarShares).values({
    ownerId: userId,
    friendId: friendId,
  });

  return NextResponse.json({ shared: true });
}

// DELETE /api/friends/share — revoke cellar access
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { friendId } = await req.json();

  await db
    .update(cellarShares)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(
        eq(cellarShares.ownerId, userId),
        eq(cellarShares.friendId, friendId),
        sql`${cellarShares.revokedAt} is null`
      )
    );

  return NextResponse.json({ shared: false });
}
