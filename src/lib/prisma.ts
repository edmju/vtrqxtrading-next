import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: ["warn", "error"],
  });
}

prisma = global.__prisma;

export async function ensureSchema() {
  try {
    // Vérifie si la table Subscription existe
    await prisma.subscription.count();
  } catch (err) {
    console.error("⚠️ Prisma drift detected, running migrate deploy...");
    const { execSync } = await import("child_process");
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
    } catch (deployErr) {
      console.error("❌ Prisma migrate failed:", deployErr);
    }
  }
}

export default prisma;
