import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "orderlink-affiliate",
    timestamp: new Date().toISOString(),
  });
}
