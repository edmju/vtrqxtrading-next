import { NextResponse } from "next/server";
import { data } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ status: "ok", data });
}
