import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";

const PROTECTED_PREFIXES = ["/documents", "/duration"];
const PROTECTED_EXACT = ["/"];
const PUBLIC_PATHS = ["/login", "/register"];

function isProtected(pathname: string): boolean {
  if (PROTECTED_EXACT.includes(pathname)) return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow static and API without redirect
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuth = !!payload;

  if (isProtected(pathname)) {
    if (!isAuth) {
      const login = new URL("/login", request.url);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (isPublic(pathname) && isAuth) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
