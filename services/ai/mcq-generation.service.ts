import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import type { IMcqItemView, IMcqGenerationRawResponse, TCitation } from "@/types/mcq.types";
import { EDifficulty, EBloomLevel, EPromptMode, EQuestionStyle } from "@/types/mcq.types";
import { parseJsonObject } from "@/utils/json.utils";
import { buildGeneratorMessages } from "@/utils/mcq-prompts/generator-prompt.utils";
import { extractFirstCodeFence, hasValidCodeBlock, questionRepeatsCodeBlock } from "@/utils/mcq.utils";
import { getStaticSubtopicsForTopic } from "@/utils/static-ontology.utils";
import { createOpenAIClient } from "@/services/openai.services";
import type { ResponseFormatJSONSchema, ResponseFormatJSONObject } from "openai/resources/shared";

/**
 * generateMcqFromContext
 * Server-only: Generates one MCQ grounded in provided context using OpenAI chat with strict JSON output.
 */
export async function generateMcqFromContext(args: {
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  difficulty?: EDifficulty;
  bloomLevel?: EBloomLevel;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
  mode?: EPromptMode;
  codingMode?: boolean;
  negativeExamples?: string[];
  avoidTopics?: string[];
  avoidSubtopics?: string[];
  questionStyle?: EQuestionStyle;
}): Promise<IMcqItemView> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = createOpenAIClient();

  // Fetch available subtopics for this topic (dynamic ontology) to guide generation
  const availableSubtopics = getStaticSubtopicsForTopic(args.topic);

  const styleInfo = buildQuestionStyleInstruction(args.questionStyle, !!args.codingMode, args.bloomLevel);

  const { system, user } = buildGeneratorMessages({
    topic: args.topic,
    subtopic: args.subtopic ?? undefined,
    version: args.version ?? undefined,
    difficulty: args.difficulty,
    bloomLevel: args.bloomLevel,
    contextItems: args.contextItems,
    mode: args.mode ?? EPromptMode.FEW_SHOT,
    examplesCount: 12,
    codingMode: args.codingMode,
    negativeExamples: args.negativeExamples,
    availableSubtopics,
    avoidTopics: args.avoidTopics,
    avoidSubtopics: args.avoidSubtopics,
    questionStyle: styleInfo?.style,
    extraInstructions: styleInfo?.instruction ?? null,
  });

  // Structured metrics: prompt context (avoid lists, negatives, ontology)
  try {
    console.log("generation_prompt_context", {
      topic: args.topic,
      subtopic: args.subtopic ?? null,
      coding_mode: !!args.codingMode,
      available_subtopics_count: (availableSubtopics ?? []).length,
      avoid_topics_count: (args.avoidTopics ?? []).length,
      avoid_subtopics_count: (args.avoidSubtopics ?? []).length,
      negative_examples_count: (args.negativeExamples ?? []).length,
      question_style_requested: args.questionStyle ?? null,
      question_style_applied: styleInfo?.style ?? null,
    });
  } catch (err) {
    console.error("🚀 ~ generateMcqFromContext ~ err:", err);
  }

  if (styleInfo?.style) {
    try {
      console.log("generation_style_target", {
        requested: args.questionStyle ?? null,
        applied: styleInfo.style,
        coding_mode: !!args.codingMode,
        bloom_level: args.bloomLevel ?? null,
      });
    } catch (err) {
      console.error("🚀 ~ generateMcqFromContext ~ err:", err);
    }
  }
  const buildSchema = (): ResponseFormatJSONSchema["json_schema"] => ({
    name: "mcq_item",
    strict: true,
    schema: (() => {
      const citationsItem = {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: ["string", "null"] }, url: { type: "string" } },
        required: ["title", "url"],
      } as const;

      const props: Record<string, Record<string, unknown>> = {
        topic: { type: "string" },
        subtopic: { type: "string" },
        version: { type: ["string", "null"] },
        difficulty: { type: "string" },
        bloomLevel: { type: "string" },
        question: { type: "string" },
        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
        correctIndex: { type: "number" },
        explanation: { type: ["string", "null"] },
        explanationBullets: { type: "array", items: { type: "string" } },
        citations: { type: "array", items: citationsItem },
      };

      if (args.codingMode) {
        props.code = { type: "string" };
      }

      return {
        type: "object",
        additionalProperties: false,
        properties: props,
        required: Object.keys(props),
      };
    })(),
  });

  type ResponseFormat = ResponseFormatJSONSchema | ResponseFormatJSONObject;
  const responseFormat: ResponseFormat = args.codingMode
    ? { type: "json_schema", json_schema: buildSchema() }
    : { type: "json_object" };

  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: responseFormat,
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  const raw = parseJsonObject<IMcqGenerationRawResponse>(content, {});

  // Coerce and validate minimal shape
  const topic: string = String(raw.topic || args.topic || "");
  const subtopic: string = String(raw.subtopic || args.subtopic || "");
  const version: string | null = typeof raw.version === "string" ? raw.version : args.version ?? null;
  const difficultyStr: string = String(raw.difficulty || args.difficulty || "Medium");
  const bloomStr: string = String(raw.bloomLevel || args.bloomLevel || "Understand");
  const question: string = String(raw.question || "");
  const optionsArr: string[] = Array.isArray(raw.options) ? raw.options.map((o) => String(o)).slice(0, 4) : [];
  const correctIndexNum: number = typeof raw.correctIndex === "number" ? raw.correctIndex : 0;
  const citationsArr: TCitation[] = Array.isArray(raw.citations)
    ? (
        (raw.citations as Array<{ title?: string; url?: string }>)
          .map((c) => ({ title: c?.title, url: String(c?.url || "") }))
          .filter((c) => !!c.url) as TCitation[]
      ).slice(0, 3)
    : [];
  const explanation: string | undefined = typeof raw.explanation === "string" ? raw.explanation : undefined;
  const explanationBullets: string[] | undefined = Array.isArray(raw.explanationBullets)
    ? raw.explanationBullets.map((s) => String(s)).slice(0, 5)
    : undefined;

  // Normalize code into a dedicated field; also try extracting from question if missing
  const codeFromRaw: string | undefined = typeof raw.code === "string" ? raw.code : undefined;
  const codeFromQuestion: string | undefined = (() => {
    const hit = extractFirstCodeFence(question);
    if (!hit) return undefined;
    const lang = hit.lang && (hit.lang === "js" || hit.lang === "tsx") ? hit.lang : "tsx";
    return ["```" + lang, hit.content, "```"].join("\n");
  })();
  const normalizedCode: string | undefined = (() => {
    const source = codeFromRaw && codeFromRaw.trim() ? codeFromRaw : codeFromQuestion;
    if (!source || !source.trim()) return undefined;
    const t = source.trim();
    return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
  })();
  const finalQuestion: string = question;

  if (args.codingMode && normalizedCode) {
    if (questionRepeatsCodeBlock(finalQuestion, normalizedCode)) {
      throw new Error("Question must reference the code snippet instead of repeating it verbatim.");
    }
  }

  const enumDifficulty = ((): EDifficulty => {
    const s = difficultyStr.toLowerCase();
    if (s === "easy") return "Easy" as EDifficulty;
    if (s === "hard") return "Hard" as EDifficulty;
    return "Medium" as EDifficulty;
  })();
  const enumBloom = ((): EBloomLevel => {
    const s = bloomStr.toLowerCase();
    if (s.startsWith("remember")) return "Remember" as EBloomLevel;
    if (s.startsWith("understand")) return "Understand" as EBloomLevel;
    if (s.startsWith("apply")) return "Apply" as EBloomLevel;
    if (s.startsWith("analy")) return "Analyze" as EBloomLevel;
    if (s.startsWith("evalu")) return "Evaluate" as EBloomLevel;
    if (s.startsWith("create")) return "Create" as EBloomLevel;
    return "Understand" as EBloomLevel;
  })();

  const options = ((): [string, string, string, string] => {
    const filled = [...optionsArr];
    while (filled.length < 4) filled.push("");
    return [filled[0], filled[1], filled[2], filled[3]];
  })();

  const correctIndex = Math.max(0, Math.min(3, correctIndexNum | 0));

  let out: IMcqItemView = {
    topic: topic || args.topic,
    subtopic: subtopic || args.subtopic || "",
    version: version ?? undefined,
    difficulty: enumDifficulty,
    bloomLevel: enumBloom,
    question: finalQuestion,
    code: normalizedCode,
    options,
    correctIndex,
    explanation,
    explanationBullets,
    citations: citationsArr,
  };

  if (args.codingMode && out.code && questionRepeatsCodeBlock(out.question, out.code)) {
    const repairSystem = [
      "You output STRICT JSON only.",
      "Do not repeat the fenced code block inside the question text.",
      "Reference the snippet in prose (e.g., 'Given the code snippet below...') while keeping the standalone code field untouched.",
    ].join(" ");
    const repairUser = [
      "Rewrite the question so it references the provided code snippet without duplicating the fenced block.",
      "Preserve topic, subtopic, options, correctIndex, difficulty, bloomLevel, explanation, and citations.",
      JSON.stringify(out),
    ].join("\n\n");

    const repair = await client.chat.completions.create({
      model: OPENAI_CONFIG.CHAT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: repairSystem },
        { role: "user", content: repairUser },
      ],
      response_format: { type: "json_schema", json_schema: buildSchema() },
    });
    const repairedContent = repair.choices[0]?.message?.content ?? "{}";
    const repairedRaw = parseJsonObject<IMcqGenerationRawResponse>(repairedContent, {});
    if (repairedRaw && typeof repairedRaw.question === "string") {
      out = {
        ...out,
        question: repairedRaw.question,
        code: typeof repairedRaw.code === "string" && repairedRaw.code.trim() ? repairedRaw.code : out.code,
      };
    }

    if (questionRepeatsCodeBlock(out.question, out.code)) {
      throw new Error("Question must reference the code snippet instead of repeating it verbatim.");
    }
  }

  // Enforce coding-mode contract: ensure a valid 3–50 line fenced block exists in `code`.
  if (args.codingMode) {
    const codeText = out.code ?? "";
    if (!hasValidCodeBlock(codeText, { minLines: 3, maxLines: 50 })) {
      // Repair pass: ask the model to return the SAME object with a valid fenced code block.
      const repairSystem =
        "You output STRICT JSON only. The object must include a 'code' string that contains a fenced js/tsx code block (3-50 lines). Do not add extra keys.";
      const repairUser = [
        "Repair this MCQ object by adding a valid fenced code block in the 'code' field.",
        "Preserve topic, subtopic, difficulty, bloomLevel, options, correctIndex, citations.",
        "Return JSON only.",
        JSON.stringify({
          topic,
          subtopic,
          version,
          difficulty: enumDifficulty,
          bloomLevel: enumBloom,
          question: finalQuestion,
          options,
          correctIndex,
          explanation,
          explanationBullets,
          citations: citationsArr,
        }),
      ].join("\n\n");

      const repair = await client.chat.completions.create({
        model: OPENAI_CONFIG.CHAT_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: repairSystem },
          { role: "user", content: repairUser },
        ],
        response_format: { type: "json_schema", json_schema: buildSchema() },
      });
      const repairedContent = repair.choices[0]?.message?.content ?? "{}";
      const repairedRaw = parseJsonObject<IMcqGenerationRawResponse>(repairedContent, {});
      const repairedCode = typeof repairedRaw.code === "string" ? repairedRaw.code : undefined;
      const fixed = (() => {
        const t = (repairedCode ?? "").trim();
        if (!t) return undefined;
        return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
      })();
      if (!fixed || !hasValidCodeBlock(fixed, { minLines: 3, maxLines: 50 })) {
        throw new Error("MissingCodeError: Model did not return required js/tsx fenced code block (3–50 lines)");
      }
      out = { ...out, code: fixed };
    }
  }

  // Structured metrics: response summary (no content bodies)
  try {
    console.log("generation_response_summary", {
      topic: out.topic,
      subtopic: out.subtopic,
      difficulty: out.difficulty,
      bloom: out.bloomLevel,
      has_code: !!out.code,
      citations_count: Array.isArray(out.citations) ? out.citations.length : 0,
    });
  } catch (err) {
    console.error("🚀 ~ generateMcqFromContext ~ err:", err);
  }

  if (styleInfo?.style) {
    out.questionStyle = styleInfo.style;
  }

  return out;
}

function buildQuestionStyleInstruction(
  userRequestedStyle: EQuestionStyle | undefined,
  codingMode: boolean | undefined,
  bloomLevel: EBloomLevel | undefined
): { style: EQuestionStyle; instruction: string } | null {
  if (userRequestedStyle) {
    return {
      style: userRequestedStyle,
      instruction: buildStyleInstruction(userRequestedStyle),
    };
  }

  const inferred = inferQuestionStyle(codingMode ?? false, bloomLevel);
  if (!inferred) {
    return null;
  }

  return {
    style: inferred,
    instruction: buildStyleInstruction(inferred),
  };
}

function inferQuestionStyle(codingMode: boolean, bloomLevel: EBloomLevel | undefined): EQuestionStyle | null {
  if (!codingMode) {
    if (bloomLevel === "Apply" || bloomLevel === "Evaluate") {
      return EQuestionStyle.TRADEOFF;
    }
    return EQuestionStyle.THEORY;
  }

  const roll = Math.random();
  if (roll < 0.5) return EQuestionStyle.CODE_READING;
  if (roll < 0.7) return EQuestionStyle.DEBUG;
  if (roll < 0.85) return EQuestionStyle.REFACTOR;
  return EQuestionStyle.TRADEOFF;
}

function buildStyleInstruction(style: EQuestionStyle): string {
  const base = "Question style directive (experimental): ";
  switch (style) {
    case EQuestionStyle.THEORY:
      return (
        base +
        "Focus on conceptual understanding without code. Ask about definitions, principles, and when/why to use concepts."
      );
    case EQuestionStyle.CODE_READING:
      return (
        base +
        "Provide a code snippet (3–15 lines) and ask the learner to reason about its behavior or output. Emphasize accurate execution tracing."
      );
    case EQuestionStyle.DEBUG:
      return (
        base +
        "Show buggy code (5–20 lines) and ask the learner to identify the issue. Use realistic pitfalls such as missing dependencies or stale closures."
      );
    case EQuestionStyle.REFACTOR:
      return (
        base +
        "Present working but suboptimal code (8–25 lines) and ask for the best improvement strategy. Compare optimization or refactoring approaches."
      );
    case EQuestionStyle.TRADEOFF:
      return (
        base +
        "Describe a scenario and ask the learner to compare approaches (e.g., Context vs Redux). Highlight decision-making and tradeoffs."
      );
    default:
      return base + "Focus on delivering an interview-relevant perspective for this topic.";
  }
}
