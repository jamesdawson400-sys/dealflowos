import { NextResponse } from "next/server";
import { getInitData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getInitData();
  return NextResponse.json(data);
}
