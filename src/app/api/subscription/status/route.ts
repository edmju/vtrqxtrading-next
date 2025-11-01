import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email?.toString().toLowerCase();

    if (!email) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
      },
    });

    if (!user?.subscription) {
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
        plan: sub.plan,
        status: sub.status,
        periodEnd: sub.currentPeriodEnd,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("status error:", err);
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
