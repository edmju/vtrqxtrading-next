import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch"; // ✅ correction

const prisma = new PrismaClient();

export async function POST() {
  try {
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    await prisma.job.create({
      data: {
        name: "Data Ingestion",
        payload: JSON.stringify(data),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Job ingestion error:", error);
    return NextResponse.json({ success: false, error: "Job failed" }, { status: 500 });
  }
}
