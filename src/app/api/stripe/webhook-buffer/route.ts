import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const metadata = invoice.lines?.data?.[0]?.metadata;
    const userId = metadata?.userId;

    if (userId) {
      await prisma.subscription.upsert({
        where: { userId },
        update: {
          status: "active",
          stripeCustomerId: invoice.customer as string,
          stripeSubId:
            invoice.subscription instanceof Object
              ? (invoice.subscription as any).id
              : (invoice.subscription as string),
          plan: "enterprise",
          periodEnd: new Date(
            (invoice.lines.data[0].period.end ?? 0) * 1000
          ),
        },
        create: {
          userId,
          status: "active",
          stripeCustomerId: invoice.customer as string,
          stripeSubId:
            invoice.subscription instanceof Object
              ? (invoice.subscription as any).id
              : (invoice.subscription as string),
          plan: "enterprise",
          periodEnd: new Date(
            (invoice.lines.data[0].period.end ?? 0) * 1000
          ),
        },
      });

      console.log("✅ Subscription updated in DB for user:", userId);
    }
  }

  return NextResponse.json({ received: true });
}
