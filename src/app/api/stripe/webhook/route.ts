import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Empêche l'exécution en Edge et le prérendu
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Test GET
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover",
    });

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-09-30.clover",
    });

    const upsertSubscriptionByUser = async (params: {
      userId: string;
      stripeCustomerId?: string | null;
      stripeSubId?: string | null;
      priceId?: string | null;
      status?: string | null;
      plan?: string | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      userEmail?: string | null;
    }) => {
      const {
        userId,
        stripeCustomerId,
        stripeSubId,
        priceId,
        status,
        plan,
        currentPeriodStart,
        currentPeriodEnd,
        userEmail,
      } = params;

      // stripeId est requis par Prisma et doit être unique.
      // On l’aligne sur l’id d’abonnement Stripe (stripeSubId) si dispo.
      const stripeIdForCreate =
        stripeSubId ??
        `sub_${userId}_${Date.now()}`; // fallback ultra rare, évite l'erreur Prisma

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          status: status ?? undefined,
          plan: plan ?? undefined,
          priceId: priceId ?? undefined,
          stripeCustomerId: stripeCustomerId ?? undefined,
          stripeSubId: stripeSubId ?? undefined,
          currentPeriodStart: currentPeriodStart ?? undefined,
          currentPeriodEnd: currentPeriodEnd ?? undefined,
          userEmail: userEmail ?? undefined,
        },
        create: {
          userId,
          // requis
          stripeId: stripeIdForCreate,
          // infos
          status: status ?? "active",
          plan: plan ?? undefined,
          priceId: priceId ?? undefined,
          stripeCustomerId: stripeCustomerId ?? undefined,
          stripeSubId: stripeSubId ?? undefined,
          currentPeriodStart: currentPeriodStart ?? undefined,
          currentPeriodEnd: currentPeriodEnd ?? undefined,
          userEmail: userEmail ?? undefined,
        },
      });
    };

    switch (event.type) {
      /**
       * 1) checkout.session.completed
       * On a toutes les métadonnées (userId, plan...), plus l’abonnement créé.
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId =
          (session.metadata?.userId as string | undefined) ||
          (session.client_reference_id as string | undefined);
        const plan = (session.metadata?.plan as string | undefined) ?? undefined;
        const userEmail =
          (session.metadata?.email as string | undefined) ??
          (session.customer_details?.email as string | undefined) ??
          undefined;

        const stripeCustomerId = (session.customer as string) ?? null;
        // L’abonnement est rattaché à la session après succès :
        // soit via session.subscription (string), soit à récupérer via API si nécessaire.
        let stripeSubId: string | null = null;
        let priceId: string | null = null;
        let status: string | null = null;
        let currentPeriodStart: Date | null = null;
        let currentPeriodEnd: Date | null = null;

        if (session.subscription) {
          const sub =
            typeof session.subscription === "string"
              ? await stripe.subscriptions.retrieve(session.subscription)
              : (session.subscription as Stripe.Subscription);

          stripeSubId = sub.id;
          status = sub.status;
          priceId = sub.items.data[0]?.price?.id ?? null;
          currentPeriodStart = sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null;
          currentPeriodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;
        }

        if (!userId) {
          console.warn(
            "⚠️ checkout.session.completed sans userId (metadata/client_reference_id)"
          );
          break;
        }

        await upsertSubscriptionByUser({
          userId,
          stripeCustomerId,
          stripeSubId,
          priceId,
          status,
          plan,
          currentPeriodStart,
          currentPeriodEnd,
          userEmail,
        });

        console.log(
          `✅ checkout.session.completed enregistré pour userId=${userId}`
        );
        break;
      }

      /**
       * 2) invoice.payment_succeeded
       * Sert de "filet de sécurité" pour certains paiements/renouvellements.
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // 1) Essaye via metadata des line items
        let userId =
          (invoice.lines?.data?.[0]?.metadata?.userId as string | undefined) ??
          undefined;
        let plan =
          (invoice.lines?.data?.[0]?.metadata?.plan as string | undefined) ??
          undefined;
        let priceId =
          (invoice.lines?.data?.[0]?.price?.id as string | undefined) ?? null;

        const stripeSubId =
          (invoice.subscription as string | undefined) ?? null;
        const stripeCustomerId = (invoice.customer as string | undefined) ?? null;

        // 2) Sinon va chercher sur la subscription
        if ((!userId || !plan || !priceId) && stripeSubId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubId);
          userId = userId ?? (sub.metadata?.userId as string | undefined);
          plan = plan ?? (sub.metadata?.plan as string | undefined);
          priceId = priceId ?? (sub.items.data[0]?.price?.id ?? null);
        }

        // Périodes
        const currentPeriodStartSec =
          invoice.lines?.data?.[0]?.period?.start ??
          (invoice.status_transitions?.paid_at ?? undefined);
        const currentPeriodEndSec =
          invoice.lines?.data?.[0]?.period?.end ??
          (invoice.status_transitions?.paid_at ?? undefined);

        const currentPeriodStart =
          currentPeriodStartSec !== undefined
            ? new Date(currentPeriodStartSec * 1000)
            : null;
        const currentPeriodEnd =
          currentPeriodEndSec !== undefined
            ? new Date(currentPeriodEndSec * 1000)
            : null;

        const status = "active";
        const userEmail =
          (invoice.customer_email as string | undefined) ?? undefined;

        if (!userId) {
          console.warn(
            "⚠️ invoice.payment_succeeded sans userId dans metadata ou subscription"
          );
          break;
        }

        await upsertSubscriptionByUser({
          userId,
          stripeCustomerId,
          stripeSubId,
          priceId,
          status,
          plan,
          currentPeriodStart,
          currentPeriodEnd,
          userEmail,
        });

        console.log(`✅ Subscription MAJ via invoice pour userId=${userId}`);
        break;
      }

      /**
       * 3) customer.subscription.updated
       */
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const userId = (sub.metadata?.userId as string | undefined) ?? undefined;
        const plan = (sub.metadata?.plan as string | undefined) ?? undefined;
        const priceId = sub.items.data[0]?.price?.id ?? null;
        const status = sub.status ?? null;
        const stripeSubId = sub.id ?? null;
        const stripeCustomerId = (sub.customer as string | undefined) ?? null;
        const currentPeriodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null;
        const currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;

        if (!userId) {
          console.warn(
            "⚠️ subscription.updated sans userId dans metadata — MAJ par customerId"
          );

          // À défaut de userId, on met à jour par customerId.
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: stripeCustomerId ?? undefined },
            data: {
              status: status ?? undefined,
              plan: plan ?? undefined,
              priceId: priceId ?? undefined,
              stripeSubId: stripeSubId ?? undefined,
              currentPeriodStart: currentPeriodStart ?? undefined,
              currentPeriodEnd: currentPeriodEnd ?? undefined,
            },
          });
          break;
        }

        await upsertSubscriptionByUser({
          userId,
          stripeCustomerId,
          stripeSubId,
          priceId,
          status,
          plan,
          currentPeriodStart,
          currentPeriodEnd,
          userEmail: null,
        });

        console.log(`✅ Subscription mise à jour pour userId=${userId}`);
        break;
      }

      /**
       * 4) customer.subscription.deleted
       */
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
        // Autres évènements ignorés
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
