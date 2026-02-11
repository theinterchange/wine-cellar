import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const { pathname } = req.nextUrl;

  const protectedPaths = ["/dashboard", "/scan", "/inventory", "/wishlist", "/wine"];
  const protectedApiPaths = ["/api/wines", "/api/inventory", "/api/wishlist"];

  const isProtectedPage = protectedPaths.some((p) => pathname.startsWith(p));
  const isProtectedApi = protectedApiPaths.some((p) => pathname.startsWith(p));

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isProtectedApi && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scan/:path*",
    "/inventory/:path*",
    "/wishlist/:path*",
    "/wine/:path*",
    "/api/wines/:path*",
    "/api/inventory/:path*",
    "/api/wishlist/:path*",
  ],
};
