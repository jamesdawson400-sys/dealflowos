import { NextRequest, NextResponse } from "next/server";
import { getNotes, insertNote, getCompany } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await getNotes(id);
  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Missing note content" }, { status: 400 });
  }

  const company = await getCompany(id);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const note = await insertNote(id, content);
  return NextResponse.json({ note });
}
