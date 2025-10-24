import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Utilisateur déjà existant" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, hashedPassword },
    });

    return NextResponse.json({ id: newUser.id, email: newUser.email });
  } catch (error) {
    console.error("Erreur register:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
