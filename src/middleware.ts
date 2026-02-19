import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const protectedPaths = ["/dashboard", "/scan", "/inventory", "/consumed", "/wishlist", "/wine", "/profile", "/friends"];
  const protectedApiPaths = ["/api/wines", "/api/inventory", "/api/consumed", "/api/wishlist", "/api/profile", "/api/friends"];

  const isProtectedPage = protectedPaths.some((p) => pathname.startsWith(p));
  const isProtectedApi = protectedApiPaths.some((p) => pathname.startsWith(p));

  // Redirect authenticated users away from auth pages
  const authPages = ["/login", "/signup"];
  if (authPages.includes(pathname) && req.auth) {
    return NextResponse.redirect(new URL("/inventory", req.url));
  }

  if (isProtectedPage && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isProtectedApi && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scan/:path*",
    "/inventory/:path*",
    "/consumed/:path*",
    "/wishlist/:path*",
    "/wine/:path*",
    "/profile/:path*",
    "/api/wines/:path*",
    "/api/inventory/:path*",
    "/api/consumed/:path*",
    "/api/wishlist/:path*",
    "/api/profile/:path*",
    "/friends/:path*",
    "/api/friends/:path*",
    "/login",
    "/signup",
  ],
};
