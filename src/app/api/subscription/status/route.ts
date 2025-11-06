// src/app/api/subscription/status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

/** Transforme un identifiant quelconque (price id OU mot-clé) -> "starter" | "pro" | "terminal" | null */
function resolvePlanKey(v?: string | null) {
  const x = (v || "").toLowerCase().trim();
  if (!x) return null;

  const starter = (process.env.STRIPE_PRICE_STARTER || "").toLowerCase();
  const pro = (process.env.STRIPE_PRICE_PRO || "").toLowerCase();
  const terminal = (process.env.STRIPE_PRICE_TERMINAL || "").toLowerCase();

  // price ids exacts
  if (x === starter) return "starter";
  if (x === pro) return "pro";
  if (x === terminal) return "terminal";

  // libellés éventuels
  if (x.includes("starter")) return "starter";
  if (x.includes("pro")) return "pro";
  if (x.includes("terminal")) return "terminal";

  return null;
}

/** Petit fallback si getServerSession échoue : on lit le cookie JWT, comme dans le checkout (même technique) */
function getEmailFromCookieJWT(): string | null {
  try {
    const c =
      cookies().get("__Secure-next-auth.session-token") ??
      cookies().get("next-auth.session-token");
    if (!c?.value) return null;
    const payloadB64 = c.value.split(".")[1] ?? "";
    const json = Buffer.from(payloadB64, "base64").toString() || "{}";
    const token = JSON.parse(json);
    const email = (token?.email || token?.user?.email || "").toString();
    return email ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // 1) session NextAuth standard
    let email: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      email = session?.user?.email ? session.user.email.toLowerCase() : null;
    } catch {
      // ignore
    }

    // 2) fallback cookie JWT si besoin (technique déjà utilisée dans le checkout)
    if (!email) email = getEmailFromCookieJWT();

    if (!email) {
      // non connecté → active=false
      return NextResponse.json({ active: false, planKey: null }, { status: 200 });
    }

    // On récupère l’utilisateur + la relation
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    // D’abord la relation
    let sub = user?.subscription ?? null;

    // Fallback robuste : par userId ou par userEmail, on prend la plus récente
    if (!sub) {
      sub =
        (await prisma.subscription.findFirst({
          where: {
            OR: [{ userId: user?.id ?? undefined }, { userEmail: email }],
          },
          orderBy: { createdAt: "desc" },
        })) || null;
    }

    const active =
      (sub?.status === "active" || sub?.status === "trialing") &&
      (!!sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) > new Date() : true);

    // Normalisation du plan : on accepte que la BDD ait "price_xxx" dans `plan` OU dans `priceId`
    const planKey =
      resolvePlanKey(sub?.plan) || resolvePlanKey(sub?.priceId) || null;

    return NextResponse.json(
      {
        active,
        planKey,
        planId: (sub?.priceId || "").toLowerCase(),
        status: sub?.status ?? null,
        periodEnd: sub?.currentPeriodEnd ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("status error:", err);
    return NextResponse.json({ active: false, planKey: null }, { status: 200 });
  }
}
