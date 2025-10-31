import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ✅ Forcer le runtime Node (évite les erreurs 405/404 sur Vercel)
export const runtime = "nodejs";
// ✅ Forcer la génération dynamique
export const dynamic = "force-dynamic";
// ✅ Durée maximale d’exécution
export const maxDuration = 60;

// Petit GET de santé pour test (optionnel)
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

    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // On tente d'abord depuis la ligne d'items
        let userId =
          invoice.lines?.data?.[0]?.metadata?.userId as string | undefined;
        let plan =
          (invoice.lines?.data?.[0]?.metadata?.plan as string) ?? "enterprise";

        // Si userId absent → on va le chercher dans la subscription (plus fiable)
        if (!userId && invoice.subscription) {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-09-30.clover",
          });
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          userId = subscription.metadata?.userId;
          plan = subscription.metadata?.plan ?? plan;
        }

        const stripeSubId = invoice.subscription as string | null;
        const stripeCustomerId = invoice.customer as string | null;

        const periodEndSec =
          invoice.lines?.data?.[0]?.period?.end ??
          (invoice.status_transitions?.paid_at ?? undefined);
        const periodEnd =
          periodEndSec !== undefined
            ? new Date(periodEndSec * 1000)
            : undefined;

        if (!userId) {
          console.warn(
            "⚠️ invoice.payment_succeeded sans userId dans metadata ou subscription"
          );
          break;
        }

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            status: "active",
            stripeSubId: stripeSubId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
            plan,
            periodEnd,
          },
          create: {
            userId,
            status: "active",
            stripeSubId: stripeSubId ?? undefined,
            stripeCustomerId: stripeCustomerId ?? undefined,
            plan,
            periodEnd,
          },
        });

        console.log(`✅ Subscription updated for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "canceled" },
        });

        console.log(`✅ Subscription canceled for customer ${customerId}`);
        break;
      }

      default:
        // console.log(`ℹ️ Unhandled event: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
