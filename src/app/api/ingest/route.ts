import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // body should be JSON array or object
  // Exemple : { events: [...] }
  const events = body.events || [body];

  let inserted = 0;
  for (const ev of events) {
    const key = `ff:${ev.id}`;
    const exists = await redis.get(key);
    if (exists) continue;

    await redis.set(key, "1", { ex: 3600 }); // anti-doublon 1h
    // stocke l’événement brut dans Redis ou dans Prisma si tu veux
    inserted++;
  }

  return NextResponse.json({ ok: true, inserted });
}
