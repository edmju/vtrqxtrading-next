import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { scope, kind, threshold, channel } = await req.json();
  const user = await prisma.users.findUnique({ where: { email: session.user.email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.alerts.create({
    data: {
      user_id: user.id,
      scope,
      kind: kind || "sentiment",
      threshold,
      channel: channel || "email",
      active: true,
    },
  });

  return NextResponse.json({ ok: true });
}

