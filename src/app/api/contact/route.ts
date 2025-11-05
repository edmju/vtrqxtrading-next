import { NextResponse } from "next/server";
import { sendEmailNotification, sendTelegramMessage } from "@/lib/notify";

export async function POST(req: Request) {
  try {
    const { email, message } = await req.json();
    if (!email || !message) {
      return NextResponse.json({ error: "Missing email or message" }, { status: 400 });
    }

    const subject = "VTRQX Contact Form";
    const body = `From: ${email}\n\n${message}`;

    try { await sendEmailNotification(subject, body); } catch {}
    try { await sendTelegramMessage(`Contact: ${email}\n${message}`); } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("contact error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
