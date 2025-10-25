import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/services/supabase.services";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import type { IAttemptResults, IWeakArea, IQuestionReview, IMcqWithExplanation } from "@/types/evaluate.types";
import { EVALUATE_API_ERROR_MESSAGES } from "@/constants/evaluate.constants";
import { logger } from "@/utils/logger.utils";

/**
 * GET /api/evaluate/attempts/:id/results
 *
 * Fetch comprehensive post-attempt analytics and review data.
 * Only available after completing all 60 questions.
 * This is the FIRST time users see any feedback about their answers.
 *
 * Returns:
 * - Summary: score percentage, time spent
 * - Topic/subtopic/Bloom breakdowns with accuracy
 * - Weak areas identification with recommendations
 * - Complete question review (all 60 questions with user answer, correct answer, explanation, citations)
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const attemptId = params?.id as string;

  if (!attemptId) {
    return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_ID_REQUIRED }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();

  // Dev mode: use default user if set
  const userId = DEV_DEFAULT_USER_ID || null;

  if (!userId && !DEV_DEFAULT_USER_ID) {
    return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.AUTHENTICATION_REQUIRED }, { status: 401 });
  }

  try {
    // 1. Fetch attempt and verify ownership + completion
    const { data: attempt, error: attemptError } = await supabase
      .from("user_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_NOT_FOUND }, { status: 404 });
    }

    if (attempt.status !== "completed") {
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_NOT_COMPLETED }, { status: 400 });
    }

    // 2. Fetch all attempt_questions with joined mcq_items and mcq_explanations
    const { data: attemptQuestions, error: questionsError } = await supabase
      .from("attempt_questions")
      .select(
        `
        id,
        question_id,
        question_order,
        user_answer_index,
        is_correct,
        answered_at,
        time_spent_seconds,
        mcq_items (
          id,
          topic,
          subtopic,
          difficulty,
          bloom_level,
          question,
          options,
          correct_index,
          citations,
          code,
          mcq_explanations (
            explanation
          )
        )
      `
      )
      .eq("attempt_id", attemptId)
      .order("question_order", { ascending: true });

    if (questionsError || !attemptQuestions) {
      logger.error("Error fetching attempt questions:", questionsError);
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_FETCH_QUESTIONS }, { status: 500 });
    }

    // 3. Compute summary
    const totalQuestions = attemptQuestions.length;
    const correctCount = attemptQuestions.filter((q) => q.is_correct).length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const timeSpentSeconds = (attempt.metadata as { time_spent_seconds?: number })?.time_spent_seconds || 0;

    const summary: IAttemptResults["summary"] = {
      total_questions: totalQuestions,
      correct_count: correctCount,
      score_percentage: scorePercentage,
      time_spent_seconds: timeSpentSeconds,
    };

    // 4. Compute topic breakdown
    const topicMap = new Map<string, { correct: number; total: number }>();

    attemptQuestions.forEach((aq) => {
      const mcq = aq.mcq_items as unknown as IMcqWithExplanation;
      if (!mcq?.topic) return;

      const topic = mcq.topic.toLowerCase();
      const current = topicMap.get(topic) || { correct: 0, total: 0 };
      current.total += 1;
      if (aq.is_correct) {
        current.correct += 1;
      }
      topicMap.set(topic, current);
    });

    const topicBreakdown: IAttemptResults["topic_breakdown"] = Array.from(topicMap.entries()).map(([topic, stats]) => ({
      category: topic,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    }));

    // 5. Compute subtopic breakdown
    const subtopicMap = new Map<string, { correct: number; total: number }>();

    attemptQuestions.forEach((aq) => {
      const mcq = aq.mcq_items as unknown as IMcqWithExplanation;
      if (!mcq?.subtopic) return;

      const subtopic = mcq.subtopic.toLowerCase();
      const current = subtopicMap.get(subtopic) || { correct: 0, total: 0 };
      current.total += 1;
      if (aq.is_correct) {
        current.correct += 1;
      }
      subtopicMap.set(subtopic, current);
    });

    const subtopicBreakdown: IAttemptResults["subtopic_breakdown"] = Array.from(subtopicMap.entries()).map(
      ([subtopic, stats]) => ({
        category: subtopic,
        correct: stats.correct,
        total: stats.total,
        accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      })
    );

    // 6. Compute Bloom breakdown
    const bloomMap = new Map<string, { correct: number; total: number }>();

    attemptQuestions.forEach((aq) => {
      const mcq = aq.mcq_items as unknown as IMcqWithExplanation;
      if (!mcq?.bloom_level) return;

      const bloom = mcq.bloom_level.toLowerCase();
      const current = bloomMap.get(bloom) || { correct: 0, total: 0 };
      current.total += 1;
      if (aq.is_correct) {
        current.correct += 1;
      }
      bloomMap.set(bloom, current);
    });

    const bloomBreakdown: IAttemptResults["bloom_breakdown"] = Array.from(bloomMap.entries()).map(([bloom, stats]) => ({
      category: bloom,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
    }));

    // 7. Identify weak areas (accuracy < 50% with at least 3 questions)
    const weakAreas: IWeakArea[] = subtopicBreakdown
      .filter((sb) => sb.accuracy < 0.5 && sb.total >= 3)
      .sort((a, b) => a.accuracy - b.accuracy) // Worst first
      .slice(0, 5) // Top 5 weak areas
      .map((sb) => {
        // Find topic for this subtopic
        const exampleQuestion = attemptQuestions.find((aq) => {
          const mcq = aq.mcq_items as unknown as IMcqWithExplanation;
          return mcq?.subtopic?.toLowerCase() === sb.category;
        });
        const mcq = exampleQuestion?.mcq_items as unknown as IMcqWithExplanation;
        const topic = mcq?.topic || "React";

        // Generate recommendation
        const accuracyPercent = Math.round(sb.accuracy * 100);
        const recommendation = `Review ${topic} documentation focusing on ${sb.category}. You scored ${accuracyPercent}% on ${sb.total} questions in this area.`;

        // Get citation URL from first question in this subtopic
        const citation = Array.isArray(mcq?.citations) && mcq.citations.length > 0 ? mcq.citations[0]?.url || "" : "";

        return {
          subtopic: sb.category,
          topic,
          accuracy: sb.accuracy,
          recommendation,
          citation,
        };
      });

    // 8. Build complete question review list
    const questions: IQuestionReview[] = attemptQuestions.map((aq) => {
      const mcq = aq.mcq_items as unknown as IMcqWithExplanation;
      const explanation = mcq?.mcq_explanations?.[0]?.explanation || "";

      return {
        question_order: aq.question_order,
        question_text: mcq?.question || "",
        options: Array.isArray(mcq?.options) ? mcq.options : [],
        code: mcq?.code || null,
        user_answer_index: aq.user_answer_index ?? null,
        correct_index: mcq?.correct_index ?? 0,
        is_correct: aq.is_correct ?? false,
        explanation: explanation,
        citations: Array.isArray(mcq?.citations) ? mcq.citations : [],
        metadata: {
          topic: mcq?.topic || "",
          subtopic: mcq?.subtopic || "",
          difficulty: mcq?.difficulty || "",
          bloom_level: mcq?.bloom_level || "",
        },
      };
    });

    // 9. Return complete results
    return NextResponse.json({
      summary,
      topic_breakdown: topicBreakdown,
      subtopic_breakdown: subtopicBreakdown,
      bloom_breakdown: bloomBreakdown,
      weak_areas: weakAreas,
      questions,
    });
  } catch (error) {
    logger.error("Error fetching attempt results:", error);
    return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
