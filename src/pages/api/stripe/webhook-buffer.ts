import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false, // ⛔ impératif pour Stripe (sinon signature invalide)
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    // Stripe n’appelle qu’en POST – on renvoie 200 pour éviter du bruit
    return res.status(200).json({ ok: true, method: req.method });
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).send("Missing Stripe-Signature");
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Signature Stripe invalide:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;

      const userId = (cs.metadata?.userId as string) || undefined;
      const plan = (cs.metadata?.plan as string) || undefined;
      const stripeCustomerId = (cs.customer as string) || undefined;
      const stripeSubId = (cs.subscription as string) || undefined;

      let periodEnd: Date | undefined;
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
      }
    }

    if (event.type === "invoice.payment_succeeded") {
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
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("❌ Handler error:", err);
    return res.status(500).send("Server error");
  }
}
