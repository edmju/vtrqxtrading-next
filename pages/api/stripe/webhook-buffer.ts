import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false, // obligatoire pour Stripe
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
    return res.status(200).json({ ok: true, method: req.method });
  }

  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).send("Missing Stripe signature");

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Invalid signature:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const metadata = invoice.lines?.data?.[0]?.metadata;
      const userId = metadata?.userId;
      const plan = metadata?.plan ?? "enterprise";
      const subId = invoice.subscription as string;
      const customerId = invoice.customer as string;
      const periodEnd = new Date(
        (invoice.lines.data[0].period.end ?? 0) * 1000
      );

      if (userId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            status: "active",
            stripeSubId: subId,
            stripeCustomerId: customerId,
            plan,
            periodEnd,
          },
          create: {
            userId,
            status: "active",
            stripeSubId: subId,
            stripeCustomerId: customerId,
            plan,
            periodEnd,
          },
        });
        console.log(`✅ Subscription updated for user ${userId}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).send("Server error");
  }
}
