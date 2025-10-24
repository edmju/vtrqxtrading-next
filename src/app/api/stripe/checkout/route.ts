import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "priceId manquant dans la requête" },
        { status: 400 }
      );
    }

    // ✅ Crée la session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `https://vtrqxtrading.xyz/subscription?success=1`,
      cancel_url: `https://vtrqxtrading.xyz/subscribe?canceled=1`,
    });

    // ✅ Retourne l’URL Stripe au frontend
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erreur Stripe checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne Stripe" },
      { status: 500 }
    );
  }
}

// ❌ Bloque les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
