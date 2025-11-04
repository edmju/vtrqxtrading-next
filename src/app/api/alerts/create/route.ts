import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { scope, kind, threshold, channel } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.alert.create({
    data: {
      userId: user.id,
      type: scope, // si ton modèle attend "type"
      threshold,
      // @ts-expect-error: garde la même structure que ton front
      channel: channel || "email",
      active: true,
    },
  });

  return NextResponse.json({ ok: true });
}
