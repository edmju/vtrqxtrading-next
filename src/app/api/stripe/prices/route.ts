import { NextResponse } from "next/server";

export async function GET() {
  const starter = process.env.STRIPE_PRICE_STARTER || "";
  const pro = process.env.STRIPE_PRICE_PRO || "";
  const terminal = process.env.STRIPE_PRICE_TERMINAL || "";

  if (!starter && !pro && !terminal) {
    return NextResponse.json(
      { error: "Stripe price ids missing: set STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO / STRIPE_PRICE_TERMINAL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ starter, pro, terminal });
}
