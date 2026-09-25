import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes except /admin/login. Require a user id rather than any
  // truthy req.auth, so a misconfigured NextAuth fails closed (see getAdminSession).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!req.auth?.user?.id) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return Response.redirect(loginUrl);
    }
  }

  // Forward pathname to server components via header
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
});

export const config = {
  matcher: ["/admin/:path*"],
};
