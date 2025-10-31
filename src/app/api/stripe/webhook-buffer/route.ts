import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// ✅ GET pour vérifier facilement que la route existe (évite 405)
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing Stripe-Signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        const userId = (cs.metadata?.userId as string) || undefined;
        const plan = (cs.metadata?.plan as string) || undefined;
        const stripeCustomerId = (cs.customer as string) || undefined;
        const stripeSubId = (cs.subscription as string) || undefined;

        let periodEnd: Date | undefined = undefined;
        if (stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          if (sub?.current_period_end) {
            periodEnd = new Date(sub.current_period_end * 1000);
          }
        }

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId,
              stripeSubId,
              status: "active",
              plan,
              periodEnd,
            },
            create: {
              userId,
              stripeCustomerId,
              stripeSubId,
              status: "active",
              plan: plan ?? "unknown",
              periodEnd,
            },
          });
          console.log(`✅ checkout.completed → Subscription activée (userId=${userId})`);
        } else {
          console.log("ℹ️ checkout.completed sans userId metadata → insertion ignorée");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;

        const line = inv.lines?.data?.[0];
        const metaLine = (line?.metadata ?? {}) as Record<string, string>;
        const metaParent = (inv.parent as any)?.subscription_details?.metadata ?? {};

        const userId =
          (metaLine.userId as string) ??
          (metaParent.userId as string) ??
          undefined;

        const priceId =
          (line?.pricing?.price_details?.price as string) ?? undefined;

        const stripeCustomerId = (inv.customer as string) || undefined;

        const subId =
          (line?.parent as any)?.subscription_item_details?.subscription ||
          (inv.parent as any)?.subscription_details?.subscription ||
          undefined;

        const periodEnd = inv.period_end ? new Date(inv.period_end * 1000) : undefined;

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId,
              stripeSubId: subId,
              status: "active",
              plan: priceId ?? undefined,
              periodEnd,
            },
            create: {
              userId,
              stripeCustomerId,
              stripeSubId: subId,
              status: "active",
              plan: priceId ?? "unknown",
              periodEnd,
            },
          });
          console.log(`✅ invoice.payment_succeeded → Subscription activée (userId=${userId})`);
        } else {
          console.log("ℹ️ invoice.payment_succeeded sans userId metadata → insertion ignorée");
        }
        break;
      }

      default:
        console.log(`⚙️ Événement non géré : ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Webhook handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
