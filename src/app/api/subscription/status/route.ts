// src/app/api/subscription/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function resolvePlanKey(v?: string | null) {
  const x = (v || "").toLowerCase();
  const starter = (process.env.STRIPE_PRICE_STARTER || "").toLowerCase();
  const pro = (process.env.STRIPE_PRICE_PRO || "").toLowerCase();
  const terminal = (process.env.STRIPE_PRICE_TERMINAL || "").toLowerCase();

  if (!x) return null;
  if (x === starter || x.includes("starter")) return "starter";
  if (x === pro || x.includes("pro")) return "pro";
  if (x === terminal || x.includes("terminal")) return "terminal";
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const email = session.user.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    // 1) d'abord via la relation User.subscription
    let sub = user?.subscription ?? null;

    // 2) fallback: chercher par email si la relation n’a pas été peuplée
    if (!sub) {
      sub =
        (await prisma.subscription.findFirst({
          where: {
            OR: [
              { userId: user?.id ?? undefined },
              { userEmail: email },
            ],
          },
          orderBy: { createdAt: "desc" },
        })) || null;
    }

    const active =
      (sub?.status === "active" || sub?.status === "trialing") &&
      (!!sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) > new Date() : true);

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
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
