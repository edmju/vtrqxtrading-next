import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma"; // adapte le chemin si besoin

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  // --- Sécurité : vérifie le header venant du GitHub Action cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("🔄 Stripe Worker lancé...");

    // Récupère les abonnements Stripe récents
    const subscriptions = await stripe.subscriptions.list({
      limit: 10,
      expand: ["data.customer", "data.items"],
    });

    for (const sub of subscriptions.data) {
      // Vérifie si déjà en base
      const existing = await prisma.subscription.findUnique({
        where: { stripeId: sub.id },
      });

      // Si non, on le crée
      if (!existing) {
        await prisma.subscription.create({
          data: {
            stripeId: sub.id,
            status: sub.status,
            priceId: sub.items.data[0]?.price.id || null,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            userEmail:
              (sub.customer as any)?.email ??
              (sub.customer as any)?.name ??
              "unknown",
          },
        });
      } else {
        // Sinon, on met à jour le statut ou la date
        await prisma.subscription.update({
          where: { stripeId: sub.id },
          data: {
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
      }
    }

    console.log("✅ Subscriptions Stripe synchronisées avec Neon");
    return NextResponse.json({
      message: "Worker OK",
      count: subscriptions.data.length,
    });
  } catch (error: any) {
    console.error("❌ Erreur Worker:", error);
    return new Response("Erreur serveur", { status: 500 });
  }
}
