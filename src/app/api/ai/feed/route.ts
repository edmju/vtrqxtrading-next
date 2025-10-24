import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { redis } from "@/lib/redis";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function safeParse<T = unknown>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  // récupérer les données de Redis
  const newsRaw = await redis.get("news:latest");
  const fredRaw = await redis.get("fred:latest");

  const news = safeParse(newsRaw);
  const fred = safeParse(fredRaw);

  const prompt = `
Tu es analyste macro. Résume ce qui suit.
News: ${JSON.stringify(news)}
Données éco: ${JSON.stringify(fred)}
Répond en JSON avec { summary, whatMoved, whatsNext }
`;

  const chat = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Tu es un analyste macro." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const text = chat.choices[0]?.message?.content || "{}";
  let insight: unknown = {};
  try {
    insight = JSON.parse(text);
  } catch {
    // garde insight = {}
  }

  await redis.set("ai:feed", JSON.stringify(insight), { ex: 3600 });

  return NextResponse.json({ ok: true, data: insight });
}
