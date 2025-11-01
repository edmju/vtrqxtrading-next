import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Non connecté." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const subscription = user.subscription;

    if (!subscription) {
      return NextResponse.json({ active: false });
    }

    const isActive = subscription.status === "active";

    return NextResponse.json({
      active: isActive,
      plan: subscription.plan,
      status: subscription.status,
      periodEnd: subscription.periodEnd,
    });
  } catch (error) {
    console.error("Erreur route /subscription/status :", error);
    return NextResponse.json(
      { error: "Erreur serveur interne." },
      { status: 500 }
    );
  }
}
