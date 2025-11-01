// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// ✅ Host dynamique (www ou non) pour conserver les cookies
function requestOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "vtrqxtrading.xyz";
  return `${proto}://${host}`;
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

    const origin = requestOrigin();

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
        plan: String(priceId).toLowerCase(),
        email: userEmail,
        userId: String(userId),
      },

      subscription_data: {
        metadata: {
          email: userEmail,
          userId: String(userId),
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
