import { SupabaseClient } from "@supabase/supabase-js";
import { EAttemptStatus, IUserAttempt } from "@/types/evaluate.types";
import { EEvaluateApiErrorMessages } from "@/types/evaluate.types";

/**
 * Fetch attempt with error handling; returns null if not found or user unauthorized
 */
export async function fetchAttemptOrFail(
  attemptId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<IUserAttempt | null> {
  const { data: attempt, error } = await supabase
    .from("user_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (error || !attempt) {
    return null;
  }

  return attempt;
}

/**
 * Check if attempt is completed; returns completion result or null if in progress
 */
export function checkCompletionStatus(attempt: IUserAttempt): { status: EAttemptStatus; completed: boolean } | null {
  if (attempt.status === EAttemptStatus.Completed) {
    return {
      status: attempt.status,
      completed: true,
    };
  }

  return null;
}

/**
 * Find existing pending question for the next order
 * Returns the pending MCQ or null if none exists
 */
export function findExistingPendingQuestion(askedQuestions: any[], nextQuestionOrder: number): any | null {
  const pending = askedQuestions.find((q: any) => {
    const answeredAt = q?.answered_at;
    const userAnswer = q?.user_answer_index;
    const orderMatches = Number(q?.question_order ?? 0) === nextQuestionOrder;
    const notAnsweredYet = typeof userAnswer !== "number" && !answeredAt;
    return orderMatches && notAnsweredYet;
  });

  return pending || null;
}

/**
 * Fetch all questions asked so far in this attempt with MCQ item details
 */
export async function validateAttemptQuestions(
  attemptId: string,
  supabase: SupabaseClient
): Promise<{ questions: any[] | null; error: any }> {
  const { data: askedQuestions, error: questionsError } = await supabase
    .from("attempt_questions")
    .select(
      `
      question_id,
      question_order,
      user_answer_index,
      answered_at,
      mcq_items!inner(
        id,
        topic,
        subtopic,
        difficulty,
        bloom_level,
        code,
        question,
        options,
        content_key,
        embedding
      )
    `
    )
    .eq("attempt_id", attemptId)
    .order("question_order", { ascending: true });

  return {
    questions: askedQuestions,
    error: questionsError,
  };
}

