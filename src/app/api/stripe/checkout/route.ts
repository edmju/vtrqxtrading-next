import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "priceId manquant dans la requête" },
        { status: 400 }
      );
    }

    // Récupère la session NextAuth côté serveur pour attacher l'email/userId en metadata
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const userId = (session?.user as any)?.id;

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://vtrqxtrading.xyz";

    // Crée la session de paiement Stripe avec metadata utile pour le webhook
    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription?success=1`,
      cancel_url: `${origin}/subscription?canceled=1`,
      customer_email: userEmail ?? undefined,
      metadata: {
        plan: String(priceId).toLowerCase() ?? "unknown", // ✅ correction ici
        ...(userEmail ? { email: userEmail } : {}),
        ...(userId ? { userId: String(userId) } : {}),
      },
      subscription_data: {
        metadata: {
          ...(userId ? { userId: String(userId) } : {}),
          ...(userEmail ? { email: userEmail } : {}),
        },
      },
    });

    return NextResponse.json({ url: sessionStripe.url });
  } catch (error: any) {
    console.error("Erreur Stripe checkout:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne Stripe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
