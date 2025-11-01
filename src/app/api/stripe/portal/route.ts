// src/app/api/stripe/portal/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

function requestOrigin() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "vtrqxtrading.xyz";
  return `${proto}://${host}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on record" },
        { status: 400 }
      );
    }

    const origin = requestOrigin();

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/subscription`,
    });

    return NextResponse.json({ url: portal.url }, { status: 200 });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "Stripe server error" }, { status: 500 });
  }
}
