import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { generateMcqFromContext } from "@/services/ai/mcq-generation.service";
import { hasValidCodeBlock, validateMcq } from "@/utils/mcq.utils";
import { retrieveContextByLabels, getRecentQuestions } from "@/services/mcq.services";
import { orchestrateMcqGenerationSSE } from "@/services/mcq-orchestration.service";
import type { IMcqItemView } from "@/types/mcq.types";
import { EBloomLevel, EDifficulty } from "@/types/mcq.types";
import type { TMcqGenerationRequest, TDocumentWithLabels } from "@/types/generation.types";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return new NextResponse(API_ERROR_MESSAGES.UNAUTHORIZED, { status: 401 });

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || "React";
    const subtopic = url.searchParams.get("subtopic");
    const version = url.searchParams.get("version");

    return await orchestrateMcqGenerationSSE({
      userId,
      topic,
      subtopic,
      version,
      codingMode: true,
      maxNeighbors: 8,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, message: error.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as TMcqGenerationRequest;
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
      const ingestionIds = (ing ?? []).map((r: { id: string }) => r.id);
      if (ingestionIds.length > 0) {
        const { data: docs } = await supabase
          .from("documents")
          .select("labels, ingestion_id")
          .in("ingestion_id", ingestionIds)
          .limit(2000);
        const subs = Array.from(
          new Set(
            (docs ?? ([] as TDocumentWithLabels[]))
              .filter((d) => (d?.labels?.["topic"] as string) === topic)
              .map((d) => d?.labels?.["subtopic"] as string | null)
              .filter((s) => typeof s === "string" && s.length > 0)
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
    logger.info(`[MCQ Generation] Coding mode: ${codingMode}, Coding requested: ${codingRequested}`);
    let item = await generateMcqFromContext({
      topic,
      subtopic: subtopic ?? undefined,
      version: version ?? undefined,
      difficulty: diffs[Math.floor(Math.random() * diffs.length)],
      bloomLevel: blooms[Math.floor(Math.random() * blooms.length)],
      contextItems: context,
      codingMode,
      negativeExamples: await getRecentQuestions({ userId, topic, subtopic: subtopic ?? undefined }),
    });

    // Retry if missing valid code block (3–50 lines)
    if (codingMode && !hasValidCodeBlock(item.code || "", { minLines: 3, maxLines: 50 })) {
      logger.info(`[MCQ Generation] First attempt missing valid code, retrying`);
      const attempt = await generateMcqFromContext({
        topic,
        subtopic: subtopic ?? undefined,
        version: version ?? undefined,
        difficulty: diffs[Math.floor(Math.random() * diffs.length)],
        bloomLevel: blooms[Math.floor(Math.random() * blooms.length)],
        contextItems: context,
        codingMode: true,
        negativeExamples: await getRecentQuestions({ userId, topic, subtopic: subtopic ?? undefined }),
      });
      if (hasValidCodeBlock(attempt.code || "", { minLines: 3, maxLines: 50 })) {
        item = attempt;
      }
    }

    // Fail-fast: if still missing a valid fenced code block after retry, return 400
    if (codingMode && !hasValidCodeBlock(item.code || "", { minLines: 3, maxLines: 50 })) {
      return NextResponse.json(
        { ok: false, message: "Generated MCQ missing required js/tsx fenced code block (3–50 lines)." },
        { status: 400 }
      );
    }

    // Centralized validation (includes duplicate code-in-question guard when requireCode)
    const validation = validateMcq(item as IMcqItemView, codingMode);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, message: "Validation failed", errors: validation.reasons },
        { status: 400 }
      );
    }

    // Fallback: ensure at least one citation
    if (!item.citations || item.citations.length === 0) {
      item.citations = context.slice(0, 2).map((c) => ({ title: c.title ?? undefined, url: c.url }));
    }

    return NextResponse.json({ ok: true, item });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, message: error.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
