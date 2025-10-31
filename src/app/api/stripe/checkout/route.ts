import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

function normalizedOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://vtrqxtrading.xyz";
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, "");
    return `${u.protocol}//${host}`;
  } catch {
    return "https://vtrqxtrading.xyz";
  }
}

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "priceId manquant ou invalide" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    let existingCustomerId: string | undefined = undefined;
    try {
      const existingSub = await prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });
      if (existingSub?.stripeCustomerId) {
        existingCustomerId = existingSub.stripeCustomerId;
      }
    } catch {}

    const origin = normalizedOrigin();

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription?success=1`,
      cancel_url: `${origin}/subscription?canceled=1`,

      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: userEmail }),

      client_reference_id: userId,

      // ✅ Métadonnées pour synchroniser avec Neon
      metadata: {
        userId: String(userId),
        email: userEmail,
        plan: String(priceId).toLowerCase(),
      },

      // ✅ Assure que Stripe Subscription transporte aussi les metadata
      subscription_data: {
        metadata: {
          userId: String(userId),
          email: userEmail,
          plan: String(priceId).toLowerCase(),
        },
      },
    });

    return NextResponse.json({ url: sessionStripe.url }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur Stripe checkout:", error);
    return NextResponse.json(
      { error: error?.message ?? "Erreur interne Stripe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
