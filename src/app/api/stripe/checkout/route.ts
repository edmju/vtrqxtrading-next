import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    // 🔐 Session utilisateur
    const sessionUser = await getServerSession(authOptions);
    const email = sessionUser?.user?.email;

    if (!email) {
      return NextResponse.json(
        { error: "Non connecté" },
        { status: 401 }
      );
    }

    const DOMAIN_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://vtrqxtrading.xyz";

    // 🧾 Crée une session Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DOMAIN_URL}/subscription?success=1`,
      cancel_url: `${DOMAIN_URL}/subscription?canceled=1`,
    });

    console.log("✅ Stripe session créée:", session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Erreur Stripe Checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erreur inconnue" },
      { status: 500 }
    );
  }
}

// 🚫 Empêche GET
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
