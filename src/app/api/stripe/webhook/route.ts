import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ✅ Empêche l'exécution en Edge (sinon 405/404 bizarres)
export const runtime = "nodejs";
// ✅ Force le mode dynamique (évite le “prérendu” et les surprises)
export const dynamic = "force-dynamic";
// (optionnel) limite d’exécution
export const maxDuration = 60;

// Petit GET de santé pour tester que l’endpoint existe bien en prod
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/stripe/webhook" });
}

export async function POST(req: Request) {
  // IMPORTANT: on lit le corps brut (App Router → req.text())
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    // Pour un test manuel avec curl sans signature, on renvoie 400 (normal)
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

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

        // On récupère metadata depuis la première ligne (classique)
        const line = invoice.lines?.data?.[0];
        const metadata = line?.metadata ?? {};
        const userId = (metadata as any)?.userId as string | undefined;
        const plan = ((metadata as any)?.plan as string) ?? "enterprise";

        const stripeSubId = invoice.subscription as string | null;
        const stripeCustomerId = invoice.customer as string | null;

        // fin de période d'abonnement depuis la ligne
        const periodEndSec = line?.period?.end ?? undefined;
        const periodEnd =
          periodEndSec !== undefined
            ? new Date(periodEndSec * 1000)
            : undefined;

        if (!userId) {
          console.warn("⚠️ invoice.payment_succeeded sans userId dans metadata");
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

        // Si tu stockes le customerId dans Subscription, on désactive via ce champ
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "canceled" },
        });

        console.log(`✅ Subscription canceled for customer ${customerId}`);
        break;
      }

      default: {
        // autres events possibles à ignorer proprement
        // console.log(`ℹ️ Unhandled event: ${event.type}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Handler error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
