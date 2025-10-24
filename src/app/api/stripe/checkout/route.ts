import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia",
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: "Price ID manquant" }, { status: 400 });
    }

    // 🔍 Vérifie si l’utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 🔑 Crée un client Stripe s’il n’existe pas
    const customer = await stripe.customers.create({
      email: user.email,
    });

    // 💳 Crée une session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://www.vtrqxtrading.xyz/subscription?success=1",
      cancel_url: "https://www.vtrqxtrading.xyz/subscribe?canceled=1",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Erreur Stripe Checkout:", err);
    return NextResponse.json(
      { error: err.message || "Erreur serveur Stripe" },
      { status: 500 }
    );
  }
}

// ❌ Important : empêche toute autre méthode HTTP
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
