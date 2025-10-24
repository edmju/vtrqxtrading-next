import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover" as any,
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ received: false }, { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("Webhook signature error", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ SESSION DE CHECKOUT TERMINÉE
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId = cs.customer as string | null;
        const subscriptionId = cs.subscription as string | null;
        const plan = (cs.metadata?.plan as string | undefined) ?? "unknown";

        if (!customerId) break;

        // Lie le stripeCustomerId ET stripeSubId
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

        break;
      }

      // ✅ SOUSCRIPTION CRÉÉE / MISE À JOUR
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const plan =
          typeof sub.items?.data?.[0]?.price?.nickname === "string"
            ? sub.items.data[0].price.nickname!.toLowerCase()
            : (sub.items?.data?.[0]?.price?.metadata?.plan as string) ??
              "unknown";

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

        break;
      }

      // ✅ SOUSCRIPTION ANNULÉE
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
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
