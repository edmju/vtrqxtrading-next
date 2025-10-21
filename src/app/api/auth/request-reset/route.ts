import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // ne révèle pas si le compte existe ou non
      return NextResponse.json({ ok: true });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.user.update({
      where: { email },
      data: { resetCode, resetCodeExpires: expires },
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"VTRQX Trading" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "VTRQX — Code de réinitialisation",
      text: `Votre code de réinitialisation est : ${resetCode} (valide 15 minutes)`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-reset error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
