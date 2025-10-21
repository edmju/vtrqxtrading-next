import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { redis } from "@/lib/redis";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
  // récupérer les données de Redis
  const newsRaw = await redis.get("news:latest");
  const fredRaw = await redis.get("fred:latest");

  const news = newsRaw ? JSON.parse(newsRaw) : null;
  const fred = fredRaw ? JSON.parse(fredRaw) : null;

  const prompt = `
Tu es analyste macro. Résume ce qui suit.
News: ${JSON.stringify(news)}
Données éco: ${JSON.stringify(fred)}
Répond en JSON avec { summary, whatMoved, whatsNext }
`;

  const chat = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Tu es un analyste macro." },
      { role: "user", content: prompt },
    ],
  });

  const text = chat.choices[0]?.message?.content || "{}";
  let insight;
  try { insight = JSON.parse(text); } catch { insight = {}; }

  await redis.set("ai:feed", JSON.stringify(insight), { ex: 3600 });

  return NextResponse.json({ ok: true, data: insight });
}
