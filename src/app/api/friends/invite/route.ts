import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteLinks } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

function nanoid(size = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

// GET /api/friends/invite — get user's active invite link
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const [link] = await db
    .select()
    .from(inviteLinks)
    .where(
      and(
        eq(inviteLinks.userId, userId),
        sql`${inviteLinks.expiresAt} > datetime('now')`,
        sql`${inviteLinks.usedBy} is null`
      )
    )
    .limit(1);

  return NextResponse.json({ invite: link || null });
}

// POST /api/friends/invite — generate a new invite link
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const code = nanoid(12);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const [link] = await db
    .insert(inviteLinks)
    .values({ userId, code, expiresAt })
    .returning();

  return NextResponse.json({ invite: link });
}
