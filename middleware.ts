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
  "/favicon.ico",
  "/_next",
  "/assets",
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Ressources publiques
  if (isPublic(pathname)) return NextResponse.next();

  // Récupère le JWT NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Pas connecté → /profile avec notice
  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?notice=login_required";
    return NextResponse.redirect(url);
  }

  // Connecté mais pas abonné → seules /profile et /subscription autorisées
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
    // protège tout sauf les assets _next, api d’auth Stripe webhook et nos pages publiques
    "/((?!_next|api/auth|api/stripe/webhook|favicon.ico|assets).*)",
  ],
};
