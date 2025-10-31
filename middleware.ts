import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/profile",
  "/subscription",
  "/request-reset",
  "/reset",
  "/api/auth",
  "/api/stripe/webhook",
  "/api/stripe/webhook-buffer",
  "/favicon.ico",
  "/_next",
  "/assets",
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ autoriser les webhooks Stripe sans auth
  if (pathname.startsWith("/api/stripe/webhook-buffer")) {
    return NextResponse.next();
  }

  // ✅ autoriser les ressources publiques
  if (isPublic(pathname)) return NextResponse.next();

  // 🔐 récupère le JWT NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 🚫 non connecté
  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?notice=login_required";
    return NextResponse.redirect(url);
  }

  // ⚠️ connecté mais pas abonné
  const hasActiveSub = (token as any).hasActiveSub === true;
  if (!hasActiveSub) {
    const url = req.nextUrl.clone();
    url.pathname = "/subscription";
    url.search = "?notice=subscribe_required";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api/auth|api/stripe/webhook|api/stripe/webhook-buffer|favicon.ico|assets).*)",
  ],
};
