import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
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
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const customerId = cs.customer as string | null;
        const plan =
          (cs.metadata?.plan as string | undefined) ?? "unknown";

        if (!customerId) break;

        // relie par stripeCustomerId
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: "active",
            plan,
            // date de fin à partir de la prochaine facture si dispo
          },
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: sub.status,
            plan:
              typeof sub.items?.data?.[0]?.price?.nickname === "string"
                ? sub.items.data[0].price.nickname!.toLowerCase()
                : (sub.items?.data?.[0]?.price?.metadata?.plan as
                    | string
                    | undefined) ?? undefined,
            periodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "canceled" },
        });
        break;
      }

      default:
        // autres events ignorés
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
