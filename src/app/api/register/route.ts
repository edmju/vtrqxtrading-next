import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
    }

    // Vérifie si utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Utilisateur déjà enregistré." }, { status: 409 });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        subscription: {
          create: {
            status: "inactive",
          },
        },
      },
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error("Erreur register:", error);
    return NextResponse.json({ error: "Erreur interne lors de l’inscription." }, { status: 500 });
  }
}
