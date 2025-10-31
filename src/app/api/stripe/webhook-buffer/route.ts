import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        // ⚙️ métadonnées envoyées par ton checkout (email, userId, plan)
        const email =
          cs.customer_details?.email ??
          (cs.metadata?.email || undefined);
        const userId = (cs.metadata?.userId as string) || undefined;

        // IDs Stripe
        const stripeCustomerId = (cs.customer as string) || undefined;
        const stripeSubId = (cs.subscription as string) || undefined;

        // plan (price_xxx)
        const plan = (cs.metadata?.plan as string) || undefined;

        // Période (si subscription attachée)
        let periodEnd: Date | undefined = undefined;
        if (stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          if (sub?.current_period_end) {
            periodEnd = new Date(sub.current_period_end * 1000);
          }
        }

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId }, // ton schéma place un unique sur userId
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
          console.log(`✅ checkout.completed → Subscription activée pour userId=${userId}`);
        } else {
          console.log("ℹ️ checkout.completed reçu sans userId metadata, rien inséré.");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;

        // ⚙️ on récupère les métadonnées au bon endroit :
        // - ligne d'item de l'invoice (lines.data[0].metadata)
        // - parent.subscription_details.metadata
        // selon l’API version, les deux existent (tu m’as montré les deux)
        const line = inv.lines?.data?.[0];
        const metaLine = (line?.metadata ?? {}) as Record<string, string>;
        const metaParent = (inv.parent as any)?.subscription_details?.metadata ?? {};

        const email =
          inv.customer_email ??
          metaLine.email ??
          metaParent.email ??
          undefined;

        const userId =
          (metaLine.userId as string) ??
          (metaParent.userId as string) ??
          undefined;

        const priceId =
          (line?.pricing?.price_details?.price as string) ?? undefined;

        const stripeCustomerId = (inv.customer as string) || undefined;

        // On retrouve la subscription ID
        const subId =
          (line?.parent as any)?.subscription_item_details?.subscription ||
          (inv.parent as any)?.subscription_details?.subscription ||
          undefined;

        // dates de période
        const periodEnd = inv.period_end ? new Date(inv.period_end * 1000) : undefined;

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId }, // unique(userId)
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
          console.log(`✅ invoice.payment_succeeded → Subscription activée pour userId=${userId}`);
        } else {
          console.log("ℹ️ invoice.payment_succeeded reçu sans userId metadata, rien inséré.");
        }
        break;
      }

      default: {
        console.log(`⚙️ Événement non géré : ${event.type}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Erreur Webhook Stripe :", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}

// (App Router: pas de bodyParser config nécessaire ici, on lit req.text() ci-dessus)
