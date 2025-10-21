import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

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

    const origin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
