/**
 * Evaluation API client functions with TanStack Query hooks
 * Handles attempts creation, question retrieval, answer submission, and results analytics
 */

import { apiClient } from "@/services/http.services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  IAttemptsSummary,
  IAttemptDetailsResponse,
  ISubmitAnswerRequest,
  ISubmitAnswerResponse,
  IAttemptResults,
} from "@/types/evaluate.types";

/**
 * createAttempt
 * Creates a new 60-question evaluation attempt for the current user.
 * Returns the attempt ID and initial status.
 */
export async function createAttempt(): Promise<{ attempt_id: string; total_questions: number; status: string }> {
  const { data } = await apiClient.post("/api/evaluate/attempts", {});
  return data as { attempt_id: string; total_questions: number; status: string };
}

/**
 * getAttempts
 * Fetches list of user's attempts with optional status filter.
 * Returns summary information for each attempt.
 */
export async function getAttempts(params?: {
  status?: "in_progress" | "completed";
  limit?: number;
}): Promise<IAttemptsSummary> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set("status", params.status);
  if (params?.limit) queryParams.set("limit", String(params.limit));

  const url = "/api/evaluate/attempts" + (queryParams.toString() ? `?${queryParams.toString()}` : "");
  const { data } = await apiClient.get(url);
  return data as IAttemptsSummary;
}

/**
 * getAttemptDetails
 * Fetches attempt details with progress and next question.
 * Backend invokes LLM selector to determine optimal next question based on attempt context.
 */
export async function getAttemptDetails(attemptId: string): Promise<IAttemptDetailsResponse> {
  const { data } = await apiClient.get(`/api/evaluate/attempts/${attemptId}`);
  return data as IAttemptDetailsResponse;
}

/**
 * submitAnswer
 * Submits user's answer for the current question.
 * Records answer silently without revealing correctness (no feedback until completion).
 */
export async function submitAnswer(attemptId: string, payload: ISubmitAnswerRequest): Promise<ISubmitAnswerResponse> {
  const { data } = await apiClient.post(`/api/evaluate/attempts/${attemptId}/answer`, payload);
  return data as ISubmitAnswerResponse;
}

/**
 * getAttemptResults
 * Fetches complete post-attempt analytics and review data.
 * Only available after completing all 60 questions.
 * This is the FIRST time users see scores, correctness feedback, explanations, and citations.
 */
export async function getAttemptResults(attemptId: string): Promise<IAttemptResults> {
  const { data } = await apiClient.get(`/api/evaluate/attempts/${attemptId}/results`);
  return data as IAttemptResults;
}

/**
 * pauseAttempt
 * Pauses and saves current attempt state.
 * Updates session metadata for later resumption.
 */
export async function pauseAttempt(attemptId: string): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.patch(`/api/evaluate/attempts/${attemptId}`, { action: "pause" });
  return data as { status: string; message: string };
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

/**
 * useCreateAttemptMutation
 * Mutation hook for starting a new evaluation attempt.
 * Invalidates attempts list on success.
 */
export function useCreateAttemptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAttempt,
    onSuccess: () => {
      // Invalidate attempts list to show new attempt
      queryClient.invalidateQueries({ queryKey: ["evaluate", "attempts"] });
    },
  });
}

/**
 * useAttemptsQuery
 * Query hook for fetching list of user's attempts.
 */
export function useAttemptsQuery(params?: { status?: "in_progress" | "completed"; limit?: number }) {
  return useQuery({
    queryKey: ["evaluate", "attempts", params],
    queryFn: () => getAttempts(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * useAttemptDetailsQuery
 * Query hook for fetching attempt details with next question.
 * Backend invokes LLM selector on each fetch to determine optimal next question.
 */
export function useAttemptDetailsQuery(attemptId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["evaluate", "attempts", attemptId, "details"],
    queryFn: () => {
      if (!attemptId) throw new Error("Attempt ID is required");
      return getAttemptDetails(attemptId);
    },
    enabled: enabled && !!attemptId,
    staleTime: 0, // Always fetch fresh (LLM selector needs latest state)
    refetchOnMount: true,
  });
}

/**
 * useSubmitAnswerMutation
 * Mutation hook for submitting answers.
 * Invalidates attempt details to trigger next question fetch.
 */
export function useSubmitAnswerMutation(attemptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ISubmitAnswerRequest) => submitAnswer(attemptId, payload),
    onSuccess: (response) => {
      // Invalidate attempt details to fetch next question
      queryClient.invalidateQueries({ queryKey: ["evaluate", "attempts", attemptId, "details"] });

      // If attempt is now complete, invalidate results query
      if (response.progress.is_complete) {
        queryClient.invalidateQueries({ queryKey: ["evaluate", "attempts", attemptId, "results"] });
      }
    },
  });
}

/**
 * useAttemptResultsQuery
 * Query hook for fetching post-attempt analytics.
 * Only enabled when attempt is completed.
 */
export function useAttemptResultsQuery(attemptId: string | null, isCompleted: boolean) {
  return useQuery({
    queryKey: ["evaluate", "attempts", attemptId, "results"],
    queryFn: () => {
      if (!attemptId) throw new Error("Attempt ID is required");
      return getAttemptResults(attemptId);
    },
    enabled: isCompleted && !!attemptId,
    staleTime: 5 * 60 * 1000, // 5 minutes (results don't change after completion)
  });
}

/**
 * usePauseAttemptMutation
 * Mutation hook for pausing an attempt.
 * Invalidates attempt details on success.
 */
export function usePauseAttemptMutation(attemptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => pauseAttempt(attemptId),
    onSuccess: () => {
      // Invalidate to update session metadata
      queryClient.invalidateQueries({ queryKey: ["evaluate", "attempts", attemptId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["evaluate", "attempts"] });
    },
  });
}
