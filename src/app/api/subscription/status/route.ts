import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/**
 * Réponse JSON:
 * { active: boolean, plan?: string, status?: string, periodEnd?: string }
 */
export async function GET() {
  try {
    // 1) Session
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;

    // Si pas connecté → on répond neutre (pas d’erreur côté page)
    if (!email) {
      return NextResponse.json({ active: false });
    }

    // 2) Récup user + subscription
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        subscription: {
          select: {
            status: true,
            plan: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user?.id) {
      return NextResponse.json({ active: false });
    }

    const sub = user.subscription;
    if (!sub) {
      return NextResponse.json({ active: false });
    }

    // 3) Actif si status dans cette liste
    const ACTIVE_STATUSES = new Set(["active", "trialing"]);
    const active = ACTIVE_STATUSES.has((sub.status || "").toLowerCase());

    return NextResponse.json({
      active,
      plan: sub.plan ?? undefined,
      status: sub.status ?? undefined,
      periodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : undefined,
    });
  } catch (err: any) {
    console.error("subscription/status error:", err);
    return NextResponse.json({ active: false });
  }
}

// Méthodes non autorisées
export function POST() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
}
