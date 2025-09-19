import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Placeholder save endpoint: will persist finalized MCQ to mcq_items (to be implemented)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, message: "Save placeholder", input: body });
}
