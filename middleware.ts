import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Pages publiques web (hors API)
const PUBLIC_PATHS = [
  "/profile",
  "/subscription",
  "/request-reset",
  "/reset",
  "/favicon.ico",
  "/assets",
  "/_next"
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🚫 Ne JAMAIS intercepter l’API : on laisse passer tout /api/*
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // ✅ Laisse passer les pages publiques
  if (isPublic(pathname)) return NextResponse.next();

  // 🔐 Auth NextAuth
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

// ⚠️ Le matcher exclut tout /api/* pour éviter toute redirection 3xx dessus
export const config = {
  matcher: ["/((?!api/|_next|favicon.ico|assets).*)"]
};
