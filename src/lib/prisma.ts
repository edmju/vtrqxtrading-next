import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: ["error", "warn"],
  });
}

prisma = global.__prisma;

export async function ensureSchema() {
  try {
    await prisma.subscription.count();
  } catch (err) {
    console.error("⚠️ Prisma drift detected, running migration sync...");
    const { execSync } = await import("child_process");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  }
}

export default prisma;
