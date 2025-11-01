import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = { api: { bodyParser: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing Stripe signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover",
    });
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover",
    });

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        let userId = invoice.lines?.data?.[0]?.metadata?.userId as string | undefined;
        let plan = invoice.lines?.data?.[0]?.metadata?.plan ?? "enterprise";

        if (!userId && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          userId = subscription.metadata?.userId;
          plan = subscription.metadata?.plan ?? plan;
        }

        const stripeSubId = invoice.subscription as string | null;
        const stripeCustomerId = invoice.customer as string | null;

        const periodEndSec =
          invoice.lines?.data?.[0]?.period?.end ??
          invoice.status_transitions?.paid_at ??
          undefined;

        const currentPeriodEnd =
          periodEndSec !== undefined ? new Date(periodEndSec * 1000) : undefined;

        if (!userId) {
          console.warn("⚠️ invoice.payment_succeeded sans userId dans metadata ou subscription");
          break;
        }

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            status: "active",
            stripeSubId: stripeSubId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
            plan,
            currentPeriodEnd,
          },
          create: {
            userId,
            stripeId: stripeSubId ?? "unknown_stripe_id", // ✅ obligatoire
            status: "active",
            stripeSubId: stripeSubId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
            plan,
            currentPeriodEnd,
          },
        });

        console.log(`✅ Subscription enregistrée pour userId=${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "canceled" },
        });
        console.log(`✅ Subscription annulée pour customer=${customerId}`);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
