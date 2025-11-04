import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const config = { api: { bodyParser: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing Stripe signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      // ✅ Création/màj de l’abonnement : source de vérité Stripe → Neon
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const userId = (sub.metadata?.userId as string | undefined) ?? undefined;
        const plan =
          (sub.metadata?.plan as string | undefined) ??
          sub.items.data[0]?.price?.id ??
          undefined;

        const periodStart = new Date(sub.current_period_start * 1000);
        const periodEnd = new Date(sub.current_period_end * 1000);
        const customerId = sub.customer as string;

        // upsert par stripeId (unique) et on renseigne userId s’il est présent
        await prisma.subscription.upsert({
          where: { stripeId: sub.id },
          update: {
            userId: userId ?? undefined,
            status: sub.status,
            priceId: sub.items.data[0]?.price?.id ?? undefined,
            plan,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
          },
          create: {
            userId: userId ?? undefined,
            stripeId: sub.id,
            status: sub.status,
            priceId: sub.items.data[0]?.price?.id ?? undefined,
            plan,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
          },
        });

        break;
      }

      // ✅ Checkout terminé : rattache l’abonnement au user
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        const userId =
          (cs.client_reference_id as string | null) ??
          (cs.metadata?.userId as string | undefined) ??
          undefined;

        const subscriptionId = cs.subscription as string | null;
        const stripeCustomerId = cs.customer as string | null;
        const plan = (cs.metadata?.plan as string | undefined) ?? undefined;

        if (subscriptionId) {
          await prisma.subscription.upsert({
            where: { stripeId: subscriptionId },
            update: {
              userId: userId ?? undefined,
              status: "active",
              plan,
              stripeCustomerId: stripeCustomerId ?? undefined,
              stripeSubId: subscriptionId,
            },
            create: {
              userId: userId ?? undefined,
              stripeId: subscriptionId,
              status: "active",
              plan,
              stripeCustomerId: stripeCustomerId ?? undefined,
              stripeSubId: subscriptionId,
            },
          });
        }
        break;
      }

      // ✅ Paiement → rafraîchit la date de fin de période
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;

        const endSec =
          invoice.lines?.data?.[0]?.period?.end ??
          invoice.status_transitions?.paid_at ??
          undefined;

        if (subscriptionId && endSec) {
          await prisma.subscription.updateMany({
            where: { stripeId: subscriptionId },
            data: { currentPeriodEnd: new Date(endSec * 1000), status: "active" },
          });
        }
        break;
      }

      // ✅ Résiliation
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeId: sub.id },
          data: { status: "canceled", currentPeriodEnd: new Date(sub.current_period_end * 1000) },
        });
        break;
      }

      default:
        // autres events ignorés
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
