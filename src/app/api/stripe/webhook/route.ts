import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  let event;

  try {
    const text = await req.text();
    event = stripe.webhooks.constructEvent(
      text,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Erreur de validation Stripe:", err.message);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    console.log("📩 Stripe event reçu:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userEmail = session.customer_email as string;
      const priceId = session.metadata?.priceId || session.metadata?.plan;

      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        console.error("Utilisateur introuvable pour:", userEmail);
        return NextResponse.json({ received: false }, { status: 404 });
      }

      console.log(
        "✅ Checkout session terminée pour:",
        userEmail,
        priceId,
        user.id
      );

      // Upsert de l’abonnement (⚠️ stripeId obligatoire)
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          status: "active",
          plan: priceId,
        },
        create: {
          userId: user.id,
          stripeId: subscriptionId, // ✅ Obligatoire (clé unique)
          stripeCustomerId: customerId,
          stripeSubId: subscriptionId,
          status: "active",
          plan: priceId,
          userEmail,
        },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
