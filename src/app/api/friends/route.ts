import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendships, users, cellarShares } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";

// GET /api/friends — list friends and pending requests
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const rows = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      status: friendships.status,
      createdAt: friendships.createdAt,
      respondedAt: friendships.respondedAt,
      requesterName: sql<string>`(SELECT name FROM users WHERE id = ${friendships.requesterId})`,
      requesterEmail: sql<string>`(SELECT email FROM users WHERE id = ${friendships.requesterId})`,
      addresseeName: sql<string>`(SELECT name FROM users WHERE id = ${friendships.addresseeId})`,
      addresseeEmail: sql<string>`(SELECT email FROM users WHERE id = ${friendships.addresseeId})`,
    })
    .from(friendships)
    .where(
      and(
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
        or(eq(friendships.status, "pending"), eq(friendships.status, "accepted"))
      )
    );

  // Get all active cellar shares for this user
  const myShares = await db
    .select()
    .from(cellarShares)
    .where(
      and(
        eq(cellarShares.ownerId, userId),
        sql`${cellarShares.revokedAt} is null`
      )
    );
  const theirShares = await db
    .select()
    .from(cellarShares)
    .where(
      and(
        eq(cellarShares.friendId, userId),
        sql`${cellarShares.revokedAt} is null`
      )
    );

  const myShareSet = new Set(myShares.map((s) => s.friendId));
  const theirShareSet = new Set(theirShares.map((s) => s.ownerId));

  const result = rows.map((r) => {
    const isRequester = r.requesterId === userId;
    const friendId = isRequester ? r.addresseeId : r.requesterId;
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      respondedAt: r.respondedAt,
      direction: isRequester ? "sent" : "received",
      friend: {
        id: friendId,
        name: isRequester ? r.addresseeName : r.requesterName,
        email: isRequester ? r.addresseeEmail : r.requesterEmail,
      },
      iShareMyCellar: myShareSet.has(friendId),
      theyShareTheirCellar: theirShareSet.has(friendId),
    };
  });

  return NextResponse.json(result);
}

// POST /api/friends — send friend request by email
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Find target user
  const [target] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

  // Privacy: don't reveal if email exists
  if (!target || target.id === userId) {
    return NextResponse.json({ message: "Request sent" });
  }

  // Check for existing friendship
  const [existing] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, target.id)),
        and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, userId))
      )
    )
    .limit(1);

  if (existing) {
    // Auto-accept if there's a pending request from the other person
    if (existing.status === "pending" && existing.requesterId === target.id) {
      await db
        .update(friendships)
        .set({ status: "accepted", respondedAt: new Date().toISOString() })
        .where(eq(friendships.id, existing.id));
      return NextResponse.json({ message: "Request sent" });
    }
    // Already friends or already sent
    return NextResponse.json({ message: "Request sent" });
  }

  // Create new friendship request
  await db.insert(friendships).values({
    requesterId: userId,
    addresseeId: target.id,
    status: "pending",
  });

  return NextResponse.json({ message: "Request sent" });
}
