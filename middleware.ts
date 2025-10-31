import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// chemins publics (pages seulement)
const PUBLIC_PATHS = [
  "/profile",
  "/subscription",
  "/request-reset",
  "/reset",
  "/favicon.ico",
  "/_next",
  "/assets",
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🚫 JAMAMAIS sur /api/** (toutes API doivent être libres)
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // 🚫 Pas de garde sur les assets internes
  if (isPublic(pathname)) return NextResponse.next();

  // Auth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?notice=login_required";
    return NextResponse.redirect(url);
  }

  const hasActiveSub = (token as any).hasActiveSub === true;
  if (!hasActiveSub) {
    const url = req.nextUrl.clone();
    url.pathname = "/subscription";
    url.search = "?notice=subscribe_required";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Le matcher applique le middleware seulement sur le “site”, pas sur API
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|assets).*)"],
};
