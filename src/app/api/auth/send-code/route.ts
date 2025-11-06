import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmailNotification } from "@/lib/notify";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const code = generateCode();

    await prisma.user.update({
      where: { email: String(email).toLowerCase() },
      data: { verificationCode: code, verified: false },
    });

    await sendEmailNotification("VTRQX • Verification code", `Your verification code: ${code}`);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-code error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
