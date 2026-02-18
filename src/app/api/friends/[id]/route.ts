import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendships, cellarShares } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

// PATCH /api/friends/[id] — accept or decline a friend request
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = await params;
  const { action } = await req.json();

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Only the addressee can accept/decline
  const [request] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, parseInt(id)),
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "pending")
      )
    )
    .limit(1);

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await db
    .update(friendships)
    .set({
      status: action === "accept" ? "accepted" : "declined",
      respondedAt: new Date().toISOString(),
    })
    .where(eq(friendships.id, request.id));

  return NextResponse.json({ success: true });
}

// DELETE /api/friends/[id] — unfriend (also revokes all cellar shares)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = await params;
  const friendshipId = parseInt(id);

  // Verify user is part of this friendship
  const [record] = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.id, friendshipId),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))
      )
    )
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const friendId = record.requesterId === userId ? record.addresseeId : record.requesterId;

  // Delete friendship
  await db.delete(friendships).where(eq(friendships.id, friendshipId));

  // Revoke all cellar shares in both directions
  const now = new Date().toISOString();
  await db
    .update(cellarShares)
    .set({ revokedAt: now })
    .where(
      and(
        or(
          and(eq(cellarShares.ownerId, userId), eq(cellarShares.friendId, friendId)),
          and(eq(cellarShares.ownerId, friendId), eq(cellarShares.friendId, userId))
        ),
        sql`${cellarShares.revokedAt} is null`
      )
    );

  return NextResponse.json({ success: true });
}
