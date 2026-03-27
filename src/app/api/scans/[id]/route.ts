import { NextRequest, NextResponse } from "next/server";
import { getScan, getCompaniesByScan } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = getScan(id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }
  const companies = getCompaniesByScan(id);
  return NextResponse.json({ scan, companies });
}
