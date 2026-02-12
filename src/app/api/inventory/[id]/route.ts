import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { inventory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.quantity !== undefined) update.quantity = body.quantity;
  if (body.purchaseDate !== undefined) update.purchaseDate = body.purchaseDate;
  if (body.purchasePrice !== undefined) update.purchasePrice = body.purchasePrice;
  if (body.notes !== undefined) update.notes = body.notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(inventory)
    .set(update)
    .where(and(eq(inventory.id, parseInt(id)), eq(inventory.userId, parseInt(session.user.id))));

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(inventory)
    .where(and(eq(inventory.id, parseInt(id)), eq(inventory.userId, parseInt(session.user.id))));

  return NextResponse.json({ success: true });
}
