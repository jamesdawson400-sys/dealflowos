import { NextRequest, NextResponse } from "next/server";
import { toggleWatchlist } from "@/lib/db";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await toggleWatchlist(id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ company });
}
