import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteLinks, friendships, users } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

// GET /api/friends/invite/[code] — resolve an invite code
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const [link] = await db
    .select({
      id: inviteLinks.id,
      userId: inviteLinks.userId,
      code: inviteLinks.code,
      expiresAt: inviteLinks.expiresAt,
      usedBy: inviteLinks.usedBy,
      userName: sql<string>`(SELECT name FROM users WHERE id = ${inviteLinks.userId})`,
    })
    .from(inviteLinks)
    .where(eq(inviteLinks.code, code))
    .limit(1);

  if (!link) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (link.usedBy) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  if (new Date(link.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({
    inviterName: link.userName,
    inviterId: link.userId,
  });
}

// POST /api/friends/invite/[code] — accept an invite (creates friendship)
export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { code } = await params;

  const [link] = await db
    .select()
    .from(inviteLinks)
    .where(
      and(
        eq(inviteLinks.code, code),
        sql`${inviteLinks.usedBy} is null`,
        sql`${inviteLinks.expiresAt} > datetime('now')`
      )
    )
    .limit(1);

  if (!link) {
    return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
  }

  if (link.userId === userId) {
    return NextResponse.json({ error: "Cannot use your own invite" }, { status: 400 });
  }

  // Mark invite as used
  await db
    .update(inviteLinks)
    .set({ usedBy: userId, usedAt: new Date().toISOString() })
    .where(eq(inviteLinks.id, link.id));

  // Check for existing friendship
  const [existing] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, link.userId)),
        and(eq(friendships.requesterId, link.userId), eq(friendships.addresseeId, userId))
      )
    )
    .limit(1);

  if (existing) {
    // Auto-accept if pending
    if (existing.status === "pending") {
      await db
        .update(friendships)
        .set({ status: "accepted", respondedAt: new Date().toISOString() })
        .where(eq(friendships.id, existing.id));
    }
  } else {
    // Create accepted friendship directly
    await db.insert(friendships).values({
      requesterId: link.userId,
      addresseeId: userId,
      status: "accepted",
      respondedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}
