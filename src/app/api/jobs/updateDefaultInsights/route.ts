import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  const prompt = `
  Génère un résumé macroéconomique global pour le jour actuel
  en 3 phrases max. Mentionne inflation, PIB, indices et sentiment global.
  Fournis aussi une estimation de sentiment (-100 à +100) et momentum (-100 à +100)
  sous format JSON { summary, sentiment, momentum }.
  `;

  const completion = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0].message?.content;
  let ai;
  try {
    ai = JSON.parse(content || "{}");
  } catch {
    ai = {
      summary: "Les marchés restent attentistes avec une inflation stable et un dollar fort.",
      sentiment: 0,
      momentum: 0,
    };
  }

  const newData = {
    asof: new Date().toISOString(),
    scope: "GLOBAL",
    sentiment: ai.sentiment,
    momentum: ai.momentum,
    summary: { text: ai.summary },
    trades: {
      buy_confidence: Math.floor(Math.random() * 100),
      sell_confidence: Math.floor(Math.random() * 100),
    },
  };

  const filePath = path.join(process.cwd(), "src/lib/defaultInsights.ts");
  const contentToWrite = `export const defaultInsights = [${JSON.stringify(newData, null, 2)}];`;
  fs.writeFileSync(filePath, contentToWrite);

  return NextResponse.json({ status: "ok", updated: newData });
}
