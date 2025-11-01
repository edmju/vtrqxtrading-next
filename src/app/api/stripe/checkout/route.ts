// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/src/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  try {
    // 1) Auth obligatoire
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Body { priceId }
    const { priceId } = (await req.json()) as { priceId?: string };
    if (!priceId) {
      return NextResponse.json({ error: "priceId manquant" }, { status: 400 });
    }

    // 3) Récup user + éventuelle subscription existante (pour réutiliser le customer Stripe)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, subscription: { select: { stripeCustomerId: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const existingCustomerId = user.subscription?.stripeCustomerId ?? undefined;

    // 4) Crée la Checkout Session
    //    ⚠️ On N’ÉCRIT RIEN EN BDD ICI (votre schéma impose `stripeId` non-nullable,
    //    donc on crée/maj la Subscription uniquement via le webhook avec le vrai `sub_...`)
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // si on a déjà un customer Stripe, on le réutilise, sinon on laisse Stripe en créer un avec l'email
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
    const message =
      typeof err?.message === "string" ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
