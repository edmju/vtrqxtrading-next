import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getToken } from "next-auth/jwt";
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

    // ✅ On utilise getToken au lieu de getServerSession
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    const userEmail = token?.email?.toString().toLowerCase();
    const userId = token?.sub as string | undefined;

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    // Vérifie si un client Stripe existe déjà
    let existingCustomerId: string | undefined;
    const existingSub = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });
    if (existingSub?.stripeCustomerId) {
      existingCustomerId = existingSub.stripeCustomerId;
    }

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
      metadata: {
        userId: userId,
        email: userEmail,
        plan: String(priceId).toLowerCase(),
      },
      subscription_data: {
        metadata: {
          userId: userId,
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
