import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  try {
    // 1) Session NextAuth (peut être null)
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    if (!email) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    // 2) Param d’entrée
    const { priceId } = (await req.json().catch(() => ({}))) as {
      priceId?: string;
    };
    if (!priceId) {
      return NextResponse.json({ error: "priceId manquant" }, { status: 400 });
    }

    // 3) User + éventuel Stripe customer
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        subscription: { select: { stripeCustomerId: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const customerId = user.subscription?.stripeCustomerId || undefined;

    // 4) Session Checkout
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?status=cancel`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        email: user.email!,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          email: user.email!,
        },
      },
    });

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (err: any) {
    console.error("Erreur Stripe checkout:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 },
    );
  }
}

// Méthodes non autorisées
export function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
}
