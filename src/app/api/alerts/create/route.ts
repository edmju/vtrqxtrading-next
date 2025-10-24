import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { scope, kind, threshold, channel } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.alert.create({
    data: {
      userId: user.id,
      scope,
      kind: kind || "sentiment",
      threshold,
      channel: channel || "email",
      active: true,
    },
  });

  return NextResponse.json({ ok: true });
}
