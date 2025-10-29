import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const redis = Redis.fromEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// ⚙️ Même logique que ton ancien webhook (on traite la file calmement)
async function handleStripeEvent(event: Stripe.Event) {
  console.log("⚙️ Traitement Stripe event:", event.type);

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = cs.subscription as string | null;
    const customerId = cs.customer as string | null;
    const email = cs.customer_details?.email ?? cs.metadata?.email;
    const plan = cs.metadata?.plan ?? "unknown";
    const userId = cs.metadata?.userId ?? null;

    if (!email && !userId) return;

    const user =
      userId
        ? await prisma.user.findUnique({ where: { id: userId } })
        : await prisma.user.findUnique({ where: { email } });

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
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await prisma.subscription.updateMany({
      where: {
        OR: [
          { stripeSubId: sub.id },
          { stripeCustomerId: sub.customer as string },
        ],
      },
      data: { status: "canceled" },
    });
    console.log(`🛑 Subscription annulée ${sub.id}`);
  }
}

export async function GET() {
  const eventsRaw = await redis.lrange("stripe_webhook_queue", 0, -1);
  if (!eventsRaw.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const raw of eventsRaw) {
    try {
      const parsed = JSON.parse(raw);
      const event = stripe.webhooks.constructEvent(
        parsed.body,
        parsed.signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      await handleStripeEvent(event);
      processed++;
    } catch (err) {
      console.error("⚠️ Erreur traitement Stripe event:", err);
    }
  }

  await redis.del("stripe_webhook_queue");
  return NextResponse.json({ processed });
}
