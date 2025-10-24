import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

// ✅ Paramètres Vercel : exécution en arrière-plan et NodeJS
export const runtime = "nodejs";
export const preferredRegion = "fra1"; // (ou change selon ta région)
export const maxDuration = 60; // autorise jusqu’à 60s
export const dynamic = "force-dynamic";
export const routeSegmentConfig = {
  runtime: "nodejs",
  background: true, // ✅ lance la route en tâche de fond pour éviter les [429]
};

// ✅ Initialisation Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover" as any,
});

// ✅ Webhook principal
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ received: false, error: "Missing signature" }, { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("❌ Invalid webhook signature:", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    console.log("📩 Stripe event reçu:", event.type);

    switch (event.type) {
      // ✅ Paiement réussi (utile pour tests Stripe CLI)
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("✅ Payment intent succeeded:", pi.id);

        await prisma.subscription.updateMany({
          where: { status: "inactive" },
          data: {
            status: "active",
            plan: "test",
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }

      // ✅ Session checkout terminée
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId = cs.customer as string | null;
        const subscriptionId = cs.subscription as string | null;
        const plan = (cs.metadata?.plan as string | undefined) ?? "unknown";

        if (!customerId) break;

        await prisma.subscription.updateMany({
          where: {
            OR: [
              { stripeCustomerId: customerId },
              { stripeSubId: subscriptionId ?? undefined },
            ],
          },
          data: {
            stripeCustomerId: customerId,
            stripeSubId: subscriptionId ?? undefined,
            status: "active",
            plan,
          },
        });

        console.log(`✅ Subscription activée pour ${customerId}`);
        break;
      }

      // ✅ Souscription créée / mise à jour
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const plan =
          typeof sub.items?.data?.[0]?.price?.nickname === "string"
            ? sub.items.data[0].price.nickname!.toLowerCase()
            : (sub.items?.data?.[0]?.price?.metadata?.plan as string) ?? "unknown";

        const periodEnd =
          (sub as any).current_period?.end ??
          (sub as any).current_period_end ??
          null;

        await prisma.subscription.updateMany({
          where: {
            OR: [
              { stripeCustomerId: customerId },
              { stripeSubId: sub.id },
            ],
          },
          data: {
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
            status:
              sub.status === "trialing" || sub.status === "active"
                ? "active"
                : sub.status,
            plan,
            periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          },
        });

        console.log(`🔄 Subscription mise à jour pour ${customerId}`);
        break;
      }

      // ✅ Souscription supprimée
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.subscription.updateMany({
          where: {
            OR: [
              { stripeCustomerId: customerId },
              { stripeSubId: sub.id },
            ],
          },
          data: { status: "canceled" },
        });

        console.log(`🛑 Subscription annulée pour ${customerId}`);
        break;
      }

      default:
        console.log(`ℹ️ Event ignoré: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
