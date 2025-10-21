import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verificationCode !== code) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    await prisma.user.update({
      where: { email },
      data: { verified: true, verificationCode: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
