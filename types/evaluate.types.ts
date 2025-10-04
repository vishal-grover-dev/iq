/**
 * TypeScript types for the evaluation feature
 * Defines interfaces for attempts, questions, results, and analytics
 */

import { EDifficulty, EBloomLevel } from "./mcq.types";

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
 * Citation object with URL and title
 */
export interface ICitation {
  url: string;
  title: string;
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
