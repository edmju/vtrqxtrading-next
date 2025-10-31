import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/api/stripe/webhook-buffer",
  "/api/stripe/worker",
  "/api/auth",
  "/favicon.ico",
  "/_next",
  "/assets",
  "/profile",
  "/subscription",
  "/request-reset",
  "/reset"
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ⚠️ Ne jamais intercepter Stripe Webhook
  if (isPublic(pathname)) return NextResponse.next();

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

export const config = {
  matcher: ["/((?!api/stripe/webhook-buffer|api/auth|_next|favicon.ico|assets).*)"]
};
