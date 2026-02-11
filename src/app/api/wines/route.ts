import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allWines = await db
    .select()
    .from(wines)
    .where(eq(wines.createdBy, parseInt(session.user.id)));

  return NextResponse.json(allWines);
}
