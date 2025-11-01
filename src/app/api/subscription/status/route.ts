import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Si pas de session: on répond 200 avec active:false (évite les 401 bruyants côté UI)
    if (!session?.user?.email) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const email = session.user.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    const sub = user?.subscription || null;

    const active =
      sub?.status === "active" &&
      (!!sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) > new Date() : true);

    return NextResponse.json(
      {
        active,
        plan: sub?.plan ?? sub?.priceId ?? null,
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
