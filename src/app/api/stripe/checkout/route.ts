// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma"; // ✅ chemin corrigé ici

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth obligatoire
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    // 2️⃣ Récupération du plan
    const { priceId } = (await req.json()) as { priceId?: string };
    if (!priceId) {
      return NextResponse.json({ error: "priceId manquant" }, { status: 400 });
    }

    // 3️⃣ Récupère l’utilisateur avec éventuelle subscription
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        subscription: {
          select: { stripeCustomerId: true },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const existingCustomerId = user.subscription?.stripeCustomerId ?? undefined;

    // 4️⃣ Crée la session Stripe Checkout
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?status=cancel`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        email: user.email,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          email: user.email,
        },
      },
    });

    return NextResponse.json({ url: sessionStripe.url }, { status: 200 });
  } catch (err: any) {
    console.error("Erreur Stripe checkout:", err);
    const message = typeof err?.message === "string" ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
}
