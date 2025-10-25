import type { IMcqItemView } from "@/types/mcq.types";
import { retrieveContextByLabels, retrieveNeighbors, getRecentQuestions } from "@/utils/mcq-retrieval.utils";
import { generateMcqFromContext } from "@/services/ai/mcq-generation.service";
import { judgeMcqQuality } from "@/services/ai/mcq-refinement.service";
import { hasValidCodeBlock, validateMcq } from "@/utils/mcq.utils";
import type { TSseEventName, IOrchestrateArgs } from "@/types/generation.types";
import { logger } from "@/utils/logger.utils";

/**
 * Writes an SSE event to the ReadableStream controller.
 * Helper to keep events consistently formatted.
 */
function writeEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: TSseEventName, data: unknown) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  controller.enqueue(new TextEncoder().encode(`event: ${event}\n`));
  controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
}

/**
 * Orchestrate MCQ generation via Server-Sent Events (SSE).
 * Pipeline stages:
 * 1. Retrieve context by labels
 * 2. Generate MCQ draft
 * 3. Fetch neighbors + recent questions
 * 4. Judge quality
 * 5. Finalize
 */
export async function orchestrateMcqGenerationSSE(args: IOrchestrateArgs): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stage 1: Initialize
        const { topic, subtopic, version, codingMode = true } = args;
        writeEvent(controller, "generation_started", { topic, subtopic, version });

        // Stage 2: Retrieve context
        const q = [topic, subtopic ?? "", version ?? ""].filter(Boolean).join(" ") + " key concepts";
        const context = await retrieveContextByLabels({
          userId: args.userId,
          topic,
          subtopic,
          version,
          query: q,
          topK: 8,
        });
        const negativeExamples = await getRecentQuestions({
          userId: args.userId,
          topic,
          subtopic: subtopic ?? undefined,
        });

        // Stage 3: Generate MCQ draft
        let item = await generateMcqFromContext({
          topic,
          subtopic: subtopic ?? undefined,
          version: version ?? undefined,
          contextItems: context,
          codingMode,
          negativeExamples,
        });

        // Retry once if missing valid code block (3–50 lines)
        if (!hasValidCodeBlock(item.code || "", { minLines: 3, maxLines: 50 })) {
          const attempt = await generateMcqFromContext({
            topic,
            subtopic: subtopic ?? undefined,
            version: version ?? undefined,
            contextItems: context,
            codingMode,
            negativeExamples,
          });
          if (hasValidCodeBlock(attempt.code || "", { minLines: 3, maxLines: 50 })) {
            item = attempt;
          } else {
            writeEvent(controller, "error", {
              reason: "missing_code",
              message: "Generated MCQ missing required js/tsx fenced code block (3–50 lines).",
            });
            controller.close();
            return;
          }
        }

        // Centralized validation including no-dup code-in-question
        const validation = validateMcq(item as IMcqItemView, codingMode);
        if (!validation.ok) {
          writeEvent(controller, "error", {
            reason: "validation_failed",
            errors: validation.reasons,
          });
          controller.close();
          return;
        }

        writeEvent(controller, "generation_complete", { item });

        // Stage 4: Fetch neighbors
        const neighbors = await retrieveNeighbors({
          userId: args.userId,
          topic,
          subtopic,
          mcq: item,
          topK: args.maxNeighbors ?? 8,
        });
        writeEvent(controller, "neighbors", {
          count: neighbors.length,
          top: neighbors.slice(0, 5).map((n) => ({
            question: n.question,
            options: n.options,
            score: n.score,
          })),
        });

        // Stage 5: Judge quality
        writeEvent(controller, "judge_started", {});
        const verdict = await judgeMcqQuality({
          mcq: item as IMcqItemView,
          contextItems: context,
          neighbors: neighbors.slice(0, 6),
          codingMode,
        });
        writeEvent(controller, "judge_result", verdict);

        // Stage 6: Finalize
        writeEvent(controller, "finalized", { ok: true });
      } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e));
        logger.error("Error in orchestrateMcqGenerationSSE", error);
        writeEvent(controller, "error", {
          message: error?.message ?? "Failed",
        });
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
}
