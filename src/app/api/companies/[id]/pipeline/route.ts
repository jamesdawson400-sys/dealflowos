import { NextRequest, NextResponse } from "next/server";
import { updatePipelineStage } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const stage = typeof body.stage === "string" ? body.stage.trim() : "";

  const validStages = ["New", "Reviewing", "First Pass", "Partner Review", "Watchlist", "Pass"];
  if (!validStages.includes(stage)) {
    return NextResponse.json({ error: "Invalid pipeline stage" }, { status: 400 });
  }

  const company = await updatePipelineStage(id, stage);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ company });
}
