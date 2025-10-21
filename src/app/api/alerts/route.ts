import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import nodemailer from "nodemailer";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function sendTelegramMessage(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"VTRQX Trading Alerts" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, telegramId, type, threshold, scope = "GLOBAL" } = body;

    if (!email && !telegramId) {
      return NextResponse.json({ error: "Email ou Telegram ID requis" }, { status: 400 });
    }

    const userAlert = await prisma.alert.create({
      data: { email, telegramId, type, threshold, scope },
    });

    await redis.set(`alert:${userAlert.id}`, JSON.stringify(userAlert));

    return NextResponse.json({ success: true, id: userAlert.id });
  } catch (error) {
    console.error("Erreur POST /api/alerts :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany();

    for (const alert of alerts) {
      const shouldTrigger = Math.random() < 0.1; // simulation
      if (shouldTrigger) {
        const msg = `⚠️ Alerte ${alert.type} : seuil ${alert.threshold} dépassé`;

        if (alert.email) {
          await sendEmail(alert.email, "Alerte Trading", `<p>${msg}</p>`);
        }
        if (alert.telegramId) {
          await sendTelegramMessage(alert.telegramId, msg);
        }

        console.log("Alerte envoyée :", alert.id);
      }
    }

    return NextResponse.json({ ok: true, sent: alerts.length });
  } catch (error) {
    console.error("Erreur GET /api/alerts :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
