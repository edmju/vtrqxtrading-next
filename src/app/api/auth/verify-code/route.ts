import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    const record = await prisma.verificationCode.findUnique({ where: { userEmail: email } });

    if (!record || record.code !== code || new Date(record.expiresAt) < new Date()) {
      return Response.json({ success: false, error: "Code invalide ou expiré" });
    }

    await prisma.user.update({
      where: { email },
      data: { verified: true },
    });

    // Supprime le code après validation
    await prisma.verificationCode.delete({ where: { userEmail: email } });

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Erreur verify-code:", err);
    return Response.json({ success: false, error: err.message });
  }
}
