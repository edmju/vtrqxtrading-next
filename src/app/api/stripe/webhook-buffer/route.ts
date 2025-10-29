import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ⚙️ Connexion à Upstash Redis (clé déjà présente dans Vercel)
const redis = Redis.fromEnv();

// ✅ Ce handler reçoit directement l’appel Stripe et stocke le body brut
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // le corps JSON brut envoyé par Stripe
    const signature = req.headers.get("stripe-signature");

    // On stocke la requête dans une file Redis
    await redis.lpush(
      "stripe_webhook_queue",
      JSON.stringify({
        body: rawBody,
        signature,
        receivedAt: new Date().toISOString(),
      })
    );

    console.log("📥 Événement Stripe mis en file pour traitement ultérieur.");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Erreur webhook-buffer:", err);
    return NextResponse.json({ error: "Failed to queue event" }, { status: 500 });
  }
}
