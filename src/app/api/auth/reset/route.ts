import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code, newPassword, confirmPassword } = await req.json();

    // Vérification des champs requis
    if (!email || !code || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Vérification de la correspondance des mots de passe
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Les mots de passe ne correspondent pas" }, { status: 400 });
    }

    // Vérification de la longueur du mot de passe
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Mot de passe trop court (min. 8 caractères)" }, { status: 400 });
    }

    // Récupération de l’utilisateur
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.resetCode || user.resetCode !== code) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }

    if (user.resetCodeExpires && user.resetCodeExpires.getTime() < Date.now()) {
      return NextResponse.json({ error: "Code expiré" }, { status: 400 });
    }

    // Hachage et mise à jour du mot de passe
    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        hashedPassword: hashed,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Mot de passe réinitialisé avec succès" });
  } catch (err) {
    console.error("reset error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
