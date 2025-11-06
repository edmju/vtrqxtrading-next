// src/app/api/stripe/webhook/route.ts
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

function resolvePlanKey(v?: string | null) {
  const x = (v || "").toLowerCase();
  const starter = (process.env.STRIPE_PRICE_STARTER || "").toLowerCase();
  const pro = (process.env.STRIPE_PRICE_PRO || "").toLowerCase();
  const terminal = (process.env.STRIPE_PRICE_TERMINAL || "").toLowerCase();
  if (!x) return null;
  if (x === starter || x.includes("starter")) return "starter";
  if (x === pro || x.includes("pro")) return "pro";
  if (x === terminal || x.includes("terminal")) return "terminal";
  return null;
}

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
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const metaUserId = (sub.metadata?.userId as string | undefined) ?? undefined;
        const metaEmail =
          (sub.metadata?.email as string | undefined) ??
          (sub.customer_email as string | undefined);
        const priceId = sub.items.data[0]?.price?.id?.toLowerCase();
        const keyFromMeta =
          (sub.metadata?.plan as string | undefined)?.toLowerCase() ||
          (sub.metadata?.planId as string | undefined)?.toLowerCase();

        const plan = resolvePlanKey(keyFromMeta) || resolvePlanKey(priceId) || undefined;
        const periodStart = new Date(sub.current_period_start * 1000);
        const periodEnd = new Date(sub.current_period_end * 1000);
        const customerId = sub.customer as string;

        // Si pas d'userId en metadata, on tente de le retrouver via l'email
        let userId = metaUserId;
        if (!userId && metaEmail) {
          const u = await prisma.user.findUnique({
            where: { email: metaEmail.toLowerCase() },
            select: { id: true },
          });
          if (u?.id) userId = u.id;
        }

        await prisma.subscription.upsert({
          where: { stripeId: sub.id },
          update: {
            userId: userId ?? undefined,
            userEmail: metaEmail?.toLowerCase(),
            status: sub.status,
            priceId: priceId ?? undefined,
            plan,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
          },
          create: {
            userId: userId ?? undefined,
            userEmail: metaEmail?.toLowerCase(),
            stripeId: sub.id,
            status: sub.status,
            priceId: priceId ?? undefined,
            plan,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            stripeCustomerId: customerId,
            stripeSubId: sub.id,
          },
        });

        break;
      }

      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        const metaUserId =
          (cs.client_reference_id as string | null) ??
          (cs.metadata?.userId as string | undefined) ??
          undefined;
        const stripeCustomerId = (cs.customer as string | null) ?? undefined;
        const metaEmail =
          (cs.customer_details?.email as string | undefined) ??
          (cs.customer_email as string | undefined) ??
          (cs.metadata?.email as string | undefined);

        const mPlan = (cs.metadata?.plan as string | undefined)?.toLowerCase();
        const mPlanId = (cs.metadata?.planId as string | undefined)?.toLowerCase();
        const plan = resolvePlanKey(mPlan) || resolvePlanKey(mPlanId) || undefined;

        const subscriptionId = cs.subscription as string | null;
        if (subscriptionId) {
          await prisma.subscription.upsert({
            where: { stripeId: subscriptionId },
            update: {
              userId: metaUserId ?? undefined,
              userEmail: metaEmail?.toLowerCase(),
              status: "active",
              plan,
              stripeCustomerId: stripeCustomerId ?? undefined,
              stripeSubId: subscriptionId,
            },
            create: {
              userId: metaUserId ?? undefined,
              userEmail: metaEmail?.toLowerCase(),
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

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeId: sub.id },
          data: { status: "canceled", currentPeriodEnd: new Date(sub.current_period_end * 1000) },
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
