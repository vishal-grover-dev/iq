import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Placeholder revision endpoint: applies user edit instructions to current MCQ (to be implemented)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, message: "Revise placeholder", input: body });
}
