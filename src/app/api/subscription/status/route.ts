import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    // Récupère l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    // Récupère un abonnement actif
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: "active" },
      select: { plan: true, status: true, periodEnd: true },
    });

    if (!sub) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        active: true,
        plan: sub.plan,
        status: sub.status,
        periodEnd: sub.periodEnd,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("status error:", e);
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
