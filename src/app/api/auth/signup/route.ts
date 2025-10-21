import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password, confirmPassword } = await req.json();

    if (!email || !password || !confirmPassword) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Mot de passe trop court (min. 8 caractères)" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Utilisateur déjà existant" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.create({
      data: { email, hashedPassword, verificationCode, verified: false },
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"VTRQX Trading" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "VTRQX — Code de vérification",
      text: `Votre code de vérification est : ${verificationCode}`,
    });

    return NextResponse.json({ ok: true, message: "Compte créé. Code envoyé par e-mail." });
  } catch (err) {
    console.error("signup error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
