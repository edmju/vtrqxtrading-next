import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

/**
 * GET /api/stripe/checkout?plan=basic|pro|enterprise
 * Retourne { url } vers la page de paiement Stripe
 */
export async function GET(req: NextRequest) {
  try {
    // 1) Sécurité : user connecté
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Récup plan + mapping vers les IDs de prix
    const { searchParams } = new URL(req.url);
    const plan = (searchParams.get("plan") || "").toLowerCase();

    const PRICE_MAP: Record<string, { env: string; value?: string }> = {
      basic: { env: "STRIPE_PRICE_BASIC", value: process.env.STRIPE_PRICE_BASIC },
      pro: { env: "STRIPE_PRICE_PRO", value: process.env.STRIPE_PRICE_PRO },
      enterprise: {
        env: "STRIPE_PRICE_ENTERPRISE",
        value: process.env.STRIPE_PRICE_ENTERPRISE,
      },
    };

    if (!["basic", "pro", "enterprise"].includes(plan)) {
      return NextResponse.json({ error: `Bad plan "${plan}"` }, { status: 400 });
    }

    const conf = PRICE_MAP[plan];
    if (!conf.value) {
      // Message clair avec la variable attendue
      return NextResponse.json(
        {
          error: `Price not configured for "${plan}". Ajoute ${conf.env} dans .env et redémarre 'pnpm dev'.`,
        },
        { status: 400 }
      );
    }
    const priceId = conf.value;

    // 3) User & Subscription row
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // On s'assure d'avoir une ligne Subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        status: "inactive",
        plan: "none",
      },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    // 4) Stripe customer (sur Subscription, pas sur User)
    let customerId = subscription.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // 5) Checkout session
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/subscription?success=1`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/subscription?canceled=1`;

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: sessionStripe.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Stripe server error" },
      { status: 500 }
    );
  }
}
