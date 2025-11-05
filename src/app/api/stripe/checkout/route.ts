// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { headers, cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

function requestOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.vtrqxtrading.xyz";
  return `${proto}://${host}`;
}

function planKeyFromPrice(priceId: string) {
  const id = (priceId || "").toLowerCase();
  const starter = (process.env.STRIPE_PRICE_STARTER || "").toLowerCase();
  const pro = (process.env.STRIPE_PRICE_PRO || "").toLowerCase();
  const terminal = (process.env.STRIPE_PRICE_TERMINAL || "").toLowerCase();
  if (id === starter) return "starter";
  if (id === pro) return "pro";
  if (id === terminal) return "terminal";
  return id; // fallback
}

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();
    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json({ error: "priceId manquant ou invalide" }, { status: 400 });
    }

    let session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const cookie = cookies().get("__Secure-next-auth.session-token");
      if (cookie?.value) {
        const token = JSON.parse(
          Buffer.from(cookie.value.split(".")[1] ?? "", "base64").toString() || "{}"
        );
        session = { user: { email: token?.email }, expires: "" } as any;
      }
    }

    const userEmail = session?.user?.email as string | undefined;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userEmail) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    let existingCustomerId: string | undefined;
    try {
      const existingSub = await prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });
      if (existingSub?.stripeCustomerId) {
        existingCustomerId = existingSub.stripeCustomerId;
      }
    } catch (err) {
      console.warn("Erreur récupération StripeCustomerId:", err);
    }

    const origin = requestOrigin();
    const planKey = planKeyFromPrice(priceId);
    const planId = priceId.toLowerCase();

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription?success=1`,
      cancel_url: `${origin}/subscription?canceled=1`,
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: userEmail }),
      client_reference_id: userId,
      metadata: { plan: planKey, planId, email: userEmail, userId },
      subscription_data: {
        metadata: { plan: planKey, planId, email: userEmail, userId },
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
