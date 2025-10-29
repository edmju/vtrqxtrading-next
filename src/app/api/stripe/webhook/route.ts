import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: { bodyParser: false },
};

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const routeSegmentConfig = {
  runtime: "nodejs",
  background: true,
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-09-30.clover" as any,
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json({ received: false, error: "Missing signature" }, { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("❌ Invalid webhook signature:", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    console.log("📩 Stripe event reçu:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log("✅ Payment intent succeeded:", pi.id);

        await prisma.subscription.updateMany({
          where: { status: "inactive" },
          data: {
            status: "active",
            plan: "test",
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }

      case "checkout.session.completed": {
        // Le payload peut ne pas contenir tout; on tente de récupérer email/subscription si absent
        const cs = event.data.object as Stripe.Checkout.Session;
        let customerId = (cs.customer as string) ?? null;
        let subscriptionId = (cs.subscription as string) ?? null;
        const metadataPlan = (cs.metadata?.plan as string) ?? undefined;
        const metaEmail = (cs.metadata?.email as string) ?? undefined;
        const emailFromSession = (cs.customer_details?.email as string) ?? metaEmail;

        // Si la session n'a pas retourné l'id de subscription, récupérer la session complète (expand subscription)
        if (!subscriptionId) {
          try {
            const fetched = await stripe.checkout.sessions.retrieve(cs.id as string, {
              expand: ["subscription", "customer"],
            });
            subscriptionId = (fetched.subscription as Stripe.Subscription | null)?.id ?? subscriptionId;
            // customer peut être un objet ou string selon l'API; normaliser
            if (typeof fetched.customer === "string") {
              customerId = fetched.customer;
            } else if (fetched.customer && typeof fetched.customer === "object") {
              customerId = (fetched.customer as any).id ?? customerId;
            }
          } catch (e) {
            console.warn("Unable to expand checkout.session:", e);
          }
        }

        // Tentative de matching utilisateur DB via email si disponible
        let user = null;
        if (emailFromSession) {
          user = await prisma.user.findUnique({ where: { email: emailFromSession } }).catch(() => null);
        }

        const plan = metadataPlan ?? "unknown";

        if (user) {
          // Upsert par userId (fiable si l'utilisateur existe dans la base)
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId ?? undefined,
              stripeSubId: subscriptionId ?? undefined,
              status: "active",
              plan,
              periodEnd: null,
            },
            update: {
              stripeCustomerId: customerId ?? undefined,
              stripeSubId: subscriptionId ?? undefined,
              status: "active",
              plan,
            },
          });
          console.log(`✅ Subscription activée (upsert) pour user ${user.email}`);
        } else {
          // Fallback : updateMany by stripe ids (ancien comportement) si on ne trouve pas d'user
          if (!customerId && !subscriptionId) {
            console.warn("Aucun customerId ni subscriptionId disponible pour le checkout.session.completed");
            break;
          }
          await prisma.subscription.updateMany({
            where: {
              OR: [
                customerId ? { stripeCustomerId: customerId } : undefined,
                subscriptionId ? { stripeSubId: subscriptionId } : undefined,
              ].filter(Boolean) as any[],
            },
            data: {
              stripeCustomerId: customerId ?? undefined,
              stripeSubId: subscriptionId ?? undefined,
              status: "active",
              plan,
            },
          });
          console.log(`✅ Subscription activée pour customer ${customerId ?? subscriptionId}`);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const plan =
          typeof sub.items?.data?.[0]?.price?.nickname === "string"
            ? sub.items.data[0].price.nickname!.toLowerCase()
            : (sub.items?.data?.[0]?.price?.metadata?.plan as string) ?? "unknown";

        const periodEnd =
          (sub as any).current_period?.end ?? (sub as any).current_period_end ?? null;

        // Tenter de retrouver l'email/user via les metadata (si présents)
        const subMetaEmail = (sub.metadata?.email as string) ?? undefined;
        let user = undefined;
        if (subMetaEmail) {
          user = await prisma.user.findUnique({ where: { email: subMetaEmail } }).catch(() => undefined);
        }

        if (user) {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId,
              stripeSubId: sub.id,
              status: sub.status === "trialing" || sub.status === "active" ? "active" : sub.status,
              plan,
              periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            },
            update: {
              stripeCustomerId: customerId,
              stripeSubId: sub.id,
              status: sub.status === "trialing" || sub.status === "active" ? "active" : sub.status,
              plan,
              periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
          console.log(`🔄 Subscription mise à jour (upsert) pour ${user.email}`);
        } else {
          // Fallback to updateMany if we don't have a linked user
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
              status: sub.status === "trialing" || sub.status === "active" ? "active" : sub.status,
              plan,
              periodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
          console.log(`🔄 Subscription mise à jour pour customer ${customerId}`);
        }

        break;
      }

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

        console.log(`🛑 Subscription annulée pour ${customerId}`);
        break;
      }

      default:
        console.log(`ℹ️ Event ignoré: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
