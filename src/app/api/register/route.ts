import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password)
      return NextResponse.json({ message: "Champs manquants" }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ message: "Email déjà utilisé" }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.create({ data: { email, hashedPassword: hashed } })

    return NextResponse.json({ message: "Utilisateur créé avec succès ✅" })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 })
  }
}
