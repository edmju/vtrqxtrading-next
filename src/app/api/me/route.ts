import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase();
    if (!email) return NextResponse.json({ ok: true, verified: false }, { status: 200 });

    const user = await prisma.user.findUnique({ where: { email }, select: { verified: true } });
    return NextResponse.json({ ok: true, verified: !!user?.verified }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, verified: false }, { status: 200 });
  }
}
