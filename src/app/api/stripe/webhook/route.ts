import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover" as any,
});

// ✅ Fonction principale du webhook Stripe
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

    // ================
    // 1️⃣ Paiement réussi
    // ================
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = cs.subscription as string | null;
      const customerId = cs.customer as string | null;
      const metadata = cs.metadata || {};

      const email = cs.customer_details?.email || metadata.email;
      const plan = metadata.plan || "unknown";
      const userId = metadata.userId || null;

      console.log("✅ Checkout session terminée pour:", email, plan, userId);

      // On tente de retrouver l'utilisateur
      let user = null;
      if (userId) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else if (email) {
        user = await prisma.user.findUnique({ where: { email } });
      }

      // Si l’utilisateur existe → on crée ou met à jour sa souscription
      if (user) {
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubId: subscriptionId ?? undefined,
            status: "active",
            plan,
          },
          create: {
            userId: user.id,
            stripeCustomerId: customerId ?? undefined,
            stripeSubId: subscriptionId ?? undefined,
            status: "active",
            plan,
          },
        });
        console.log(`🟢 Subscription activée pour ${user.email}`);
      } else {
        console.warn("⚠️ Aucun utilisateur trouvé pour cette session Stripe.");
      }
    }

    // ================
    // 2️⃣ Création / mise à jour d'une subscription
    // ================
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const plan =
        typeof sub.items?.data?.[0]?.price?.nickname === "string"
          ? sub.items.data[0].price.nickname!.toLowerCase()
          : (sub.items?.data?.[0]?.price?.metadata?.plan as string) ?? "unknown";

      const email = (sub.metadata?.email as string) || undefined;
      const userId = (sub.metadata?.userId as string) || undefined;
      const periodEnd =
        (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000)
          : null;

      console.log("🔄 Subscription Stripe mise à jour pour:", email, userId);

      let user = null;
      if (userId) user = await prisma.user.findUnique({ where: { id: userId } });
      else if (email) user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
            status: sub.status === "active" ? "active" : sub.status,
            plan,
            periodEnd,
          },
          create: {
            userId: user.id,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
            status: sub.status === "active" ? "active" : sub.status,
            plan,
            periodEnd,
          },
        });
        console.log(`🟢 Subscription sauvegardée / mise à jour pour ${user.email}`);
      } else {
        console.warn("⚠️ Aucun utilisateur trouvé pour cette subscription Stripe.");
      }
    }

    // ================
    // 3️⃣ Suppression d'une subscription
    // ================
    if (event.type === "customer.subscription.deleted") {
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
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
