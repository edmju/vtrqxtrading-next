import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ watchlist: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "Symbole requis" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, symbol }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }
}
