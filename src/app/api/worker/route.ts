import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import OpenAI from "openai"

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    // Récupère les 50 derniers events
    const events = await prisma.econEvent.findMany({
      orderBy: { ts: "desc" },
      take: 50,
    })

    if (!events.length) {
      return NextResponse.json({ error: "No events found" }, { status: 404 })
    }

    // Prompt IA
    const prompt = `
      Tu es un analyste macroéconomique.
      Voici les derniers événements :
      ${events.map(e => `- ${e.title} (${e.country || "?"}) impact: ${e.impact || "?"}`).join("\n")}
      Donne un JSON strict :
      {
        "macro_summary": "...",
        "bullets": ["..."],
        "risks": ["..."],
        "fx_sentiment": {"USD":0,"EUR":0,"JPY":0},
        "opportunities": [
          {"asset":"EURUSD","dir":"short","confidence":70,"horizon":"2-4j"}
        ]
      }
      Aucune explication, JSON pur uniquement.
    `

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    })

    const content = res.choices[0].message?.content || "{}"
    const parsed = JSON.parse(content)

    // Enregistre dans DB
    await prisma.insight.create({
      data: {
        scope: "global",
        sentiment: parsed.fx_sentiment?.USD || 0,
        momentum: parsed.opportunities?.length || 0,
        summary: parsed,
        drivers: parsed.fx_sentiment || {},
        trades: parsed.opportunities || [],
      },
    })

    return NextResponse.json({ ok: true, insight: parsed })
  } catch (err) {
    console.error("Worker error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
