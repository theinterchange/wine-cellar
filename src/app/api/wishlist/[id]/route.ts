import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlist, inventory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(wishlist)
    .where(and(eq(wishlist.id, parseInt(id)), eq(wishlist.userId, parseInt(session.user.id))));

  return NextResponse.json({ success: true });
}

// Move from wishlist to inventory
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(session.user.id);

  // Get the wishlist item
  const [item] = await db
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.id, parseInt(id)), eq(wishlist.userId, userId)))
    .limit(1);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Add to inventory (use quantity from request body if provided)
  let quantity = 1;
  try {
    const body = await req.json();
    if (body.quantity && Number.isInteger(body.quantity) && body.quantity > 0) {
      quantity = body.quantity;
    }
  } catch {
    // No body or invalid JSON — default to 1
  }

  await db.insert(inventory).values({
    userId,
    wineId: item.wineId,
    quantity,
  });

  // Remove from wishlist
  await db.delete(wishlist).where(eq(wishlist.id, parseInt(id)));

  return NextResponse.json({ success: true });
}
