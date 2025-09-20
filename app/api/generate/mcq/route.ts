import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getEmbeddings, generateMcqFromContext, judgeMcqQuality } from "@/services/ai.services";
import { buildMcqEmbeddingText } from "@/utils/mcq.utils";
import type { IMcqItemView } from "@/types/mcq.types";
import { EBloomLevel, EDifficulty } from "@/types/mcq.types";

export const runtime = "nodejs";

async function retrieveContextByLabels(args: {
  userId: string;
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  query: string;
  topK?: number;
}): Promise<Array<{ title?: string | null; url: string; content: string }>> {
  const supabase = getSupabaseServiceRoleClient();
  const [embedding] = await getEmbeddings([args.query]);
  const { data: rows, error } = await supabase.rpc("retrieval_hybrid_by_labels", {
    p_user_id: args.userId,
    p_topic: args.topic,
    p_query_embedding: embedding as unknown as any,
    p_query_text: args.query,
    p_subtopic: args.subtopic ?? null,
    p_version: args.version ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
    p_alpha: 0.5,
  });
  if (error) throw new Error(error.message);
  const items = (rows ?? []).map((r: any) => ({
    title: r.title as string | null,
    url: r.path as string,
    content: r.content as string,
  }));
  return items;
}

async function retrieveNeighbors(args: {
  userId: string;
  topic: string;
  subtopic?: string | null;
  mcq: IMcqItemView;
  topK?: number;
}): Promise<Array<{ question: string; options: [string, string, string, string]; score: number }>> {
  const supabase = getSupabaseServiceRoleClient();
  const [emb] = await getEmbeddings([buildMcqEmbeddingText(args.mcq)]);
  const { data, error } = await supabase.rpc("retrieval_mcq_neighbors", {
    p_user_id: args.userId,
    p_topic: args.topic,
    p_embedding: emb as unknown as any,
    p_subtopic: args.subtopic ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    question: r.question as string,
    options: (r.options ?? []).slice(0, 4) as [string, string, string, string],
    score: Number(r.score ?? 0),
  }));
}

export async function GET(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || "React";
    const subtopic = url.searchParams.get("subtopic");
    const version = url.searchParams.get("version");
    const q = [topic, subtopic ?? "", version ?? ""].filter(Boolean).join(" ") + " key concepts";

    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(new TextEncoder().encode(`event: ${event}\n`));
          controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
        }
        try {
          send("generation_started", { topic, subtopic, version });
          const context = await retrieveContextByLabels({ userId, topic, subtopic, version, query: q, topK: 8 });
          const item = await generateMcqFromContext({
            topic,
            subtopic: subtopic ?? undefined,
            version: version ?? undefined,
            contextItems: context,
          });
          send("generation_complete", { item });
          const neighbors = await retrieveNeighbors({ userId, topic, subtopic, mcq: item, topK: 8 });
          send("neighbors", {
            count: neighbors.length,
            top: neighbors.slice(0, 5).map((n) => ({ question: n.question, options: n.options, score: n.score })),
          });
          send("judge_started", {});
          const verdict = await judgeMcqQuality({
            mcq: item as IMcqItemView,
            contextItems: context,
            neighbors: neighbors.slice(0, 6),
          });
          send("judge_result", verdict);
          send("finalized", { ok: true });
        } catch (e: any) {
          send("error", { message: e?.message ?? "Failed" });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const topic: string = body?.topic || "React";
    let subtopic: string | null = body?.subtopic ?? null;
    const version: string | null = body?.version ?? null;
    const codingRequested: boolean = Boolean(body?.codingMode);
    // Add a small novelty hint to encourage varied angles across calls
    const noveltyHints = [
      "conceptual definition",
      "identify mistake in code",
      "compare with a related API",
      "edge case behavior",
      "practical scenario",
    ];
    const novelty = noveltyHints[Math.floor(Math.random() * noveltyHints.length)];
    const base = [topic, subtopic ?? "", version ?? ""].filter(Boolean).join(" ");
    let query = `${base} fundamentals, ${novelty}`;
    if (codingRequested) {
      query += ", with a short fenced code snippet";
    }

    // If subtopic not provided, pick one that actually exists in this user's corpus to diversify
    if (!subtopic) {
      const supabase = getSupabaseServiceRoleClient();
      const { data: ing } = await supabase.from("ingestions").select("id").eq("user_id", userId);
      const ingestionIds = (ing ?? []).map((r: any) => r.id);
      if (ingestionIds.length > 0) {
        const { data: docs } = await supabase
          .from("documents")
          .select("labels, ingestion_id")
          .in("ingestion_id", ingestionIds)
          .limit(2000);
        const subs = Array.from(
          new Set(
            (docs ?? [])
              .filter((d: any) => (d?.labels?.topic ?? d?.labels?.["topic"]) === topic)
              .map((d: any) => d?.labels?.subtopic)
              .filter((s: any) => typeof s === "string" && s.length > 0)
          )
        );
        if (subs.length > 0) subtopic = subs[Math.floor(Math.random() * subs.length)];
      }
    }

    let q = query;
    // Light retrieval bias for coding: prefer chunks likely containing code
    if (codingRequested) {
      q += " code example snippet import function const let jsx component react typescript";
    } else if (q.includes("identify mistake in code") || q.includes("practical scenario")) {
      q += " code example snippet import function const let jsx";
    }
    const context = await retrieveContextByLabels({ userId, topic, subtopic, version, query: q, topK: 8 });
    // Randomize difficulty/Bloom slightly to diversify output for repeated calls
    const diffs: EDifficulty[] = ["Easy", "Medium", "Hard"] as unknown as EDifficulty[];
    const blooms: EBloomLevel[] = [
      "Remember",
      "Understand",
      "Apply",
      "Analyze",
      "Evaluate",
      "Create",
    ] as unknown as EBloomLevel[];
    const codingMode = codingRequested; // respect user toggle exactly
    console.log(`[MCQ Generation] Coding mode: ${codingMode}, Coding requested: ${codingRequested}`);
    let item = await generateMcqFromContext({
      topic,
      subtopic: subtopic ?? undefined,
      version: version ?? undefined,
      difficulty: diffs[Math.floor(Math.random() * diffs.length)],
      bloomLevel: blooms[Math.floor(Math.random() * blooms.length)],
      contextItems: context,
      codingMode,
    });

    if (codingMode && typeof item.question === "string" && !item.question.includes("```")) {
      console.log(`[MCQ Generation] First attempt failed to generate code, trying again with stronger coding prompt`);
      item = await generateMcqFromContext({
        topic,
        subtopic: subtopic ?? undefined,
        version: version ?? undefined,
        difficulty: diffs[Math.floor(Math.random() * diffs.length)],
        bloomLevel: blooms[Math.floor(Math.random() * blooms.length)],
        contextItems: context,
        codingMode: true,
      });
    }

    // Final guard: if still no fenced code, inject a short snippet extracted from context
    if (codingMode && typeof item.question === "string" && !item.question.includes("```")) {
      console.log(`[MCQ Generation] OpenAI still didn't generate code, injecting from context`);
      const pickSnippet = (): string | null => {
        for (const c of context) {
          const m = c.content.match(/```[a-zA-Z]*[\s\S]*?```/);
          if (m && m[0]) return m[0];
        }
        for (const c of context) {
          const lines = c.content.split(/\r?\n/);
          const codey = lines
            .filter((ln) => /(const |let |function |=>|return |<\w+|use[A-Z]\w+\()/i.test(ln))
            .slice(0, 8);
          if (codey.length >= 2) {
            return ["```tsx", ...codey, "```"].join("\n");
          }
        }
        return null;
      };
      const snippet = pickSnippet();
      if (snippet) {
        item = { ...item, question: `${snippet}\n\n${item.question}` } as IMcqItemView;
        console.log(`[MCQ Generation] Injected code snippet into question`);
      } else {
        console.log(`[MCQ Generation] No code found in context to inject`);
      }
    }

    // Fallback: ensure at least one citation
    if (!item.citations || item.citations.length === 0) {
      item.citations = context.slice(0, 2).map((c) => ({ title: c.title ?? undefined, url: c.url }));
    }

    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
