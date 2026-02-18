import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wines } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const results = await db
    .select({
      id: wines.id,
      brand: wines.brand,
      varietal: wines.varietal,
      vintage: wines.vintage,
    })
    .from(wines)
    .where(
      q
        ? sql`${wines.createdBy} = ${userId} AND (lower(${wines.brand}) LIKE ${`%${q.toLowerCase()}%`} OR lower(${wines.varietal}) LIKE ${`%${q.toLowerCase()}%`})`
        : eq(wines.createdBy, userId)
    )
    .limit(50);

  return NextResponse.json(results);
}
