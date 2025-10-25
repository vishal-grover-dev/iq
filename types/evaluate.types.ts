/**
 * TypeScript types for the evaluation feature
 * Defines interfaces for attempts, questions, results, and analytics
 * Also contains cross-domain types used across multiple domains
 */

import { EDifficulty, EBloomLevel } from "./mcq.types";

/**
 * Citation object with URL and title
 */
export interface ICitation {
  url: string;
  title?: string;
}

/**
 * Context row from retrieval RPC
 */
export interface IContextRow {
  title: string | null;
  path: string;
  content: string;
}

/**
 * Neighbor MCQ row from retrieval
 */
export interface INeighborRow {
  question: string;
  options: string[];
  score: number;
}

/**
 * Recent question row
 */
export interface IRecentQuestionRow {
  question: string;
  subtopic: string | null;
  topic: string;
}

/**
 * MCQ item with explanation, joined from mcq_items + mcq_explanations
 */
export interface IMcqWithExplanation {
  id: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  bloom_level: string;
  question: string;
  options: string[];
  correct_index: number;
  citations: Array<{ title?: string; url?: string }>;
  code: string | null;
  mcq_explanations: Array<{ explanation: string }>;
  content_key?: string;
}

/**
 * Attempt question with joined MCQ data
 */
export interface IAttemptQuestionWithMcq {
  id: string;
  question_id: string;
  question_order: number;
  user_answer_index: number | null;
  is_correct: boolean | null;
  answered_at: string | null;
  time_spent_seconds: number | null;
  mcq_items: IMcqWithExplanation;
}

export type TAttemptQuestion = Omit<IAttemptQuestionWithMcq, "mcq_items"> & {
  mcq_items?: IAttemptQuestionWithMcq["mcq_items"];
};

/**
 * Result tier type
 */
export type TResultTier = "expert" | "proficient" | "developing" | "getting_started";

/**
 * Status of an evaluation attempt
 */
export enum EAttemptStatus {
  InProgress = "in_progress",
  Completed = "completed",
  Abandoned = "abandoned",
}

/**
 * Metadata stored with each attempt
 */
export interface IAttemptMetadata {
  session_count: number;
  pause_count: number;
  time_spent_seconds: number;
  last_session_at: string | null;
}

/**
 * User evaluation attempt record
 */
export interface IUserAttempt {
  id: string;
  user_id: string;
  status: EAttemptStatus;
  total_questions: number;
  questions_answered: number;
  correct_count: number;
  started_at: string;
  completed_at: string | null;
  metadata: IAttemptMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Attempt question linking a question to an attempt with user's answer
 */
export interface IAttemptQuestion {
  id: string;
  attempt_id: string;
  question_id: string;
  question_order: number;
  user_answer_index: number | null;
  is_correct: boolean | null;
  answered_at: string | null;
  time_spent_seconds: number | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  mcq_items?:
    | {
        id?: string;
        topic?: string;
        subtopic?: string | null;
        difficulty?: string;
        bloom_level?: string;
        question?: string;
        options?: string[];
        code?: string | null;
        content_key?: string;
        embedding?: unknown;
      }
    | Array<{
        id?: string;
        topic?: string;
        subtopic?: string | null;
        difficulty?: string;
        bloom_level?: string;
        question?: string;
        options?: string[];
        code?: string | null;
        content_key?: string;
        embedding?: unknown;
      }>;
}

/**
 * Question metadata for display during attempt
 */
export interface IQuestionMetadata {
  topic: string;
  subtopic: string | null;
  difficulty: EDifficulty;
  bloom_level: EBloomLevel;
  question_order: number;
  coding_mode: boolean;
}

/**
 * Full question data with MCQ item details
 */
export interface IEvaluationQuestion {
  id: string;
  question: string;
  options: string[];
  code: string | null;
  metadata: IQuestionMetadata;
}

/**
 * Progress information for an attempt
 */
export interface IAttemptProgress {
  questions_answered: number;
  correct_count: number;
  total_questions: number;
  is_complete: boolean;
}

/**
 * Response for getting attempt details with next question
 */
export interface IAttemptDetailsResponse {
  attempt: {
    id: string;
    status: EAttemptStatus;
    questions_answered: number;
    correct_count: number;
    total_questions: number;
  };
  next_question: IEvaluationQuestion | null;
}

/**
 * Request body for submitting an answer
 */
export interface ISubmitAnswerRequest {
  question_id: string;
  user_answer_index: number;
  time_spent_seconds: number;
}

/**
 * Response after submitting an answer (no correctness feedback)
 */
export interface ISubmitAnswerResponse {
  recorded: boolean;
  progress: IAttemptProgress;
  next_question?: IEvaluationQuestion | null;
}

/**
 * Breakdown by topic/subtopic/bloom level
 */
export interface IPerformanceBreakdown {
  category: string;
  correct: number;
  total: number;
  accuracy: number;
}

/**
 * Weak area with recommendation
 */
export interface IWeakArea {
  subtopic: string;
  topic: string;
  accuracy: number;
  recommendation: string;
  citation: string;
}

/**
 * Question review data (shown after completion)
 */
export interface IQuestionReview {
  question_order: number;
  question_text: string;
  options: string[];
  code: string | null;
  user_answer_index: number | null;
  correct_index: number;
  is_correct: boolean;
  explanation: string;
  citations: ICitation[];
  metadata: {
    topic: string;
    subtopic: string | null;
    difficulty: EDifficulty;
    bloom_level: EBloomLevel;
  };
}

/**
 * Complete results after attempt completion
 */
export interface IAttemptResults {
  summary: {
    total_questions: number;
    correct_count: number;
    score_percentage: number;
    time_spent_seconds: number;
  };
  topic_breakdown: IPerformanceBreakdown[];
  subtopic_breakdown: IPerformanceBreakdown[];
  bloom_breakdown: IPerformanceBreakdown[];
  weak_areas: IWeakArea[];
  questions: IQuestionReview[];
}

/**
 * List of user attempts with summary
 */
export interface IAttemptsSummary {
  attempts: Array<{
    id: string;
    status: EAttemptStatus;
    questions_answered: number;
    correct_count: number;
    started_at: string;
    completed_at: string | null;
  }>;
}

/**
 * LLM selector criteria for next question
 */
export interface IQuestionSelectionCriteria {
  difficulty: EDifficulty;
  coding_mode: boolean;
  preferred_topics: string[];
  preferred_subtopics: string[];
  preferred_bloom_levels: EBloomLevel[];
  reasoning: string;
}

/**
 * Attempt context for LLM selector
 */
export interface IAttemptContext {
  attempt_id: string;
  questions_answered: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  coding_count: number;
  topic_distribution: Record<string, number>;
  subtopic_distribution: Record<string, number>;
  bloom_distribution: Record<string, number>;
  recent_subtopics: string[];
  asked_question_ids: string[];
}

/**
 * Selection method used to assign a question
 */
export enum ESelectionMethod {
  BANK_TOPK = "bank_topk",
  GENERATED_ON_DEMAND = "generated_on_demand",
  EXISTING_PENDING = "existing_pending",
  BANK_EXISTING_ORDER = "bank_existing_order",
  FALLBACK_ASSIGNMENT = "fallback_assignment",
}

/**
 * Similarity gate that triggered rejection
 */
export enum ESimilarityGate {
  ATTEMPT_EMBEDDING = "attempt_similarity_high_embedding",
  ATTEMPT_TEXT = "attempt_similarity_high_text_similarity",
  ATTEMPT_EXACT = "attempt_similarity_exact_text_match",
  NEIGHBOR = "neighbor_similarity_high",
  CONTENT_KEY = "content_key_match_in_attempt",
}

/**
 * Question difficulty distribution
 */
export interface IDistributions {
  easy_count: number;
  medium_count: number;
  hard_count: number;
  coding_count: number;
  topic_distribution: Record<string, number>;
  subtopic_distribution: Record<string, number>;
  bloom_distribution: Record<string, number>;
}

/**
 * Similarity metrics for a candidate
 */
export interface ISimilarityMetrics {
  attempt_similarity?: {
    scores: number[];
    top_score: number;
  };
  neighbor_similarity?: {
    scores: number[];
    top_score: number;
  };
}

/**
 * Candidate with similarity scoring
 */
export interface ICandidateWithSimilarity {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: EDifficulty;
  bloom_level: EBloomLevel;
  question: string;
  options: string[];
  code: string | null;
  embedding?: number[] | null;
  _seenRecently?: boolean;
  similarityPenalty: number;
  similarityMetrics: ISimilarityMetrics;
}

/**
 * Scored candidate for selection
 */
export interface IScoredCandidate extends ICandidateWithSimilarity {
  score: number;
}

/**
 * LLM selector output
 */
export interface ISelectionCriteria {
  difficulty: EDifficulty;
  coding_mode: boolean;
  preferred_topic?: string;
  preferred_subtopic?: string;
  preferred_bloom_level: EBloomLevel;
}

/**
 * Question assignment result
 */
export interface IQuestionAssignmentResult {
  success: boolean;
  question_id: string;
  method: ESelectionMethod;
  error?: string;
}

// Error handling types for evaluate operations
export interface IAssignmentError {
  code?: string;
  message?: string;
}

export interface IAssignmentResult {
  success: boolean;
  assigned_question_id: string | null;
  error?: IAssignmentError | string | null;
}

// Database row types for evaluate operations
export interface IAskedQuestionRow {
  mcq_items?:
    | {
        question?: string;
        embedding?: unknown;
      }
    | Array<{
        question?: string;
        embedding?: unknown;
      }>;
}

export interface IMcqRowWithDetails {
  difficulty?: string;
  bloom_level?: string;
  topic?: string;
  subtopic?: string | null;
  code?: string | null;
}

// Bank candidate types for selection queries
export interface IBankCandidate {
  id: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  bloom_level: string;
  question: string;
  options: string[];
  code: string | null;
  embedding?: unknown;
}

export interface IBankCandidateWithMetadata extends IBankCandidate {
  _seenRecently?: boolean;
}
