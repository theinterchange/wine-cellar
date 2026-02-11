import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wines } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [wine] = await db
    .select()
    .from(wines)
    .where(and(eq(wines.id, parseInt(id)), eq(wines.createdBy, parseInt(session.user.id))))
    .limit(1);

  if (!wine) {
    return NextResponse.json({ error: "Wine not found" }, { status: 404 });
  }

  return NextResponse.json(wine);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(wines)
    .where(and(eq(wines.id, parseInt(id)), eq(wines.createdBy, parseInt(session.user.id))));

  return NextResponse.json({ success: true });
}
