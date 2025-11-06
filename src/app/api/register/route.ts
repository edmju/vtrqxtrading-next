import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmailNotification } from "@/lib/notify";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Utilisateur déjà enregistré." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = generateCode();

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        verificationCode: code,
        verified: false,
        subscription: { create: { status: "inactive" } },
      },
      select: { id: true, email: true },
    });

    await sendEmailNotification("VTRQX • Verification code", `Your verification code: ${code}`);

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Erreur register:", error);
    return NextResponse.json({ error: "Erreur interne lors de l’inscription." }, { status: 500 });
  }
}
