// scripts/news/alerts.ts

import path from "path";
import { promises as fs } from "fs";
import { AIOutput, NewsBundle, AIAction } from "./types";
import nodemailer from "nodemailer";
import fetch from "node-fetch";

type AlertConfig = {
  minConviction: number; // 0..10
  minConfidence: number; // 0..100
  telegramEnabled: boolean;
  emailEnabled: boolean;
  mobileEnabled: boolean;
};

const DEFAULT_CONFIG: AlertConfig = {
  minConviction: 4,
  minConfidence: 70,
  telegramEnabled: true,
  emailEnabled: true,
  mobileEnabled: false,
};

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const full = path.join(process.cwd(), "public", rel);
    const raw = await fs.readFile(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function filterActions(actions: AIAction[], cfg: AlertConfig): AIAction[] {
  return actions.filter(
    (a) =>
      a.conviction >= cfg.minConviction &&
      a.confidence >= cfg.minConfidence
  );
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

async function sendEmail(subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ALERT_EMAIL_TO;

  if (!host || !port || !user || !pass || !to) return;

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"VTRQX Terminal" <${user}>`,
    to,
    subject,
    text,
  });
}

async function sendMobile(text: string) {
  const url = process.env.PUSH_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text }),
  });
}

function formatActionText(action: AIAction, news: NewsBundle): string {
  const directionEmoji = action.direction === "BUY" ? "🟢" : "🔴";
  const proofs =
    action.evidenceIds && action.evidenceIds.length
      ? news.articles.filter((a) => action.evidenceIds!.includes(a.id))
      : [];

  const firstTitle = proofs[0]?.title;
  const firstSource = proofs[0]?.source;

  const lines: string[] = [];

  lines.push(
    `${directionEmoji} *${action.direction} ${action.symbol}*  (conviction ${action.conviction}/10, confiance ${action.confidence}/100)`
  );
  if (action.themeLabel) {
    lines.push(`Thème : ${action.themeLabel}`);
  }
  if (action.explanation) {
    lines.push("");
    lines.push(action.explanation);
  } else if (action.reason) {
    lines.push("");
    lines.push(action.reason);
  }
  if (firstTitle) {
    lines.push("");
    lines.push(`Exemple de source : ${firstSource} – ${firstTitle}`);
  }

  return lines.join("\n");
}

async function main() {
  const cfg = DEFAULT_CONFIG;

  const ai = await readJson<AIOutput>("data/ai/latest.json", {
    generatedAt: "",
    mainThemes: [],
    actions: [],
    clusters: [],
    focusDrivers: [],
    marketRegime: undefined,
  });

  const news = await readJson<NewsBundle>("data/news/latest.json", {
    generatedAt: "",
    total: 0,
    articles: [],
  });

  const interesting = filterActions(ai.actions, cfg);
  if (!interesting.length) {
    console.log("[news:alerts] Aucun trade IA ne dépasse les seuils.");
    return;
  }

  for (const action of interesting) {
    const txt = formatActionText(action, news);
    const subject = `[VTRQX] Signal IA: ${action.direction} ${action.symbol} (conviction ${action.conviction}/10)`;

    if (cfg.telegramEnabled) {
      await sendTelegram(txt);
    }
    if (cfg.emailEnabled) {
      await sendEmail(subject, txt.replace(/\*/g, ""));
    }
    if (cfg.mobileEnabled) {
      await sendMobile(txt.replace(/\*/g, ""));
    }

    console.log(
      `[news:alerts] Alerte envoyée pour ${action.symbol} ${action.direction}`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[news:alerts] Erreur fatale:", err);
    process.exit(1);
  });
}
