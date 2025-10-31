import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // ⚠️ Force Vercel à utiliser Node (sinon Edge → 405)

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing Stripe signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover",
    });

    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const metadata = invoice.lines?.data?.[0]?.metadata;
      const userId = metadata?.userId;
      const plan = metadata?.plan ?? "enterprise";
      const subId = invoice.subscription as string;
      const customerId = invoice.customer as string;
      const periodEnd = new Date((invoice.lines.data[0].period.end ?? 0) * 1000);

      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: { status: "active", stripeSubId: subId, stripeCustomerId: customerId, plan, periodEnd },
          create: { userId, status: "active", stripeSubId: subId, stripeCustomerId: customerId, plan, periodEnd },
        });
        console.log(`✅ Subscription updated for user ${userId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
