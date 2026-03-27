import { NextRequest, NextResponse } from "next/server";
import { getActivityLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10);
  const activity = getActivityLog(Math.min(limit, 100));
  return NextResponse.json({ activity });
}
