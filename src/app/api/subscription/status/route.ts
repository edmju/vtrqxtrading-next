import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // ⚠️ On lit le token directement (évite les soucis de session sérialisée)
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const email = token?.email?.toString().toLowerCase();
    if (!email) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    // User + subscription (selon ton schema PRISMA fourni)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            plan: true,
            priceId: true,
            stripeId: true,
            stripeCustomerId: true,
            stripeSubId: true,
          },
        },
      },
    });

    if (!user || !user.subscription) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const sub = user.subscription;
    const now = new Date();
    const active =
      sub.status === "active" &&
      (!!sub.currentPeriodEnd ? sub.currentPeriodEnd > now : true);

    return NextResponse.json(
      {
        active,
        plan: sub.plan ?? null,
        status: sub.status,
        periodEnd: sub.currentPeriodEnd ?? null,
        priceId: sub.priceId ?? null,
        stripeId: sub.stripeId ?? null,
        stripeCustomerId: sub.stripeCustomerId ?? null,
        stripeSubId: sub.stripeSubId ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("subscription/status error:", err);
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
