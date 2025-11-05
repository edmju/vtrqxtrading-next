import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ne jamais bloquer l'API
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Auth requise uniquement pour le terminal
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Si pas connecté → /profile
  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.search = "?notice=login_required";
    return NextResponse.redirect(url);
  }

  // Si pas d'abonnement actif → /subscription
  const hasActiveSub = (token as any).hasActiveSub === true;
  if (!hasActiveSub) {
    const url = req.nextUrl.clone();
    url.pathname = "/subscription";
    url.search = "?notice=subscribe_required";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Le matcher n'applique le middleware que sur /dashboard et sous-pages
export const config = {
  matcher: ["/dashboard/:path*"],
};
