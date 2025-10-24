// src/app/api/watchlist/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // Stub côté serveur (évite l’erreur "not a module" et compile sur Vercel)
  return NextResponse.json({ items: [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: "Symbole requis" }, { status: 400 });
    }
    // Stub d’enregistrement
    return NextResponse.json({ ok: true, symbol }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
