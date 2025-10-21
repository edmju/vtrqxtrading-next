import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateResearch() {
  const data = JSON.parse(fs.readFileSync("src/data/macroData_Global.json", "utf-8"));
  const prompt = `Analyse les tendances macroéconomiques suivantes et produis un résumé clair avec 
  tendances, risques, et opportunités : ${JSON.stringify(data.data.slice(0, 8))}`;

  const res = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message?.content || "Aucune analyse disponible.";
}
