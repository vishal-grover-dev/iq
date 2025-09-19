import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Basic SSE endpoint scaffold for MCQ generation (Generator → Judge → Finalize)
export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(new TextEncoder().encode(`event: ${event}\n`));
        controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
      }
      send("generation_started", { message: "Starting generation" });
      await new Promise((r) => setTimeout(r, 200));
      send("generation_delta", { text: "What is the primary purpose of useEffect in React?" });
      await new Promise((r) => setTimeout(r, 200));
      send("generation_complete", { ok: true });
      await new Promise((r) => setTimeout(r, 150));
      send("judge_started", { message: "Evaluating" });
      await new Promise((r) => setTimeout(r, 200));
      send("judge_result", { verdict: "approve" });
      await new Promise((r) => setTimeout(r, 100));
      send("finalized", { ok: true });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, message: "Generate placeholder", input: body });
}
