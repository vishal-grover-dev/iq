/**
 * TypeScript types for the evaluation feature
 * Defines interfaces for attempts, questions, results, and analytics
 */

import { EDifficulty, EBloomLevel, IMcqItemView } from "./mcq.types";

/**
 * Evaluate page labels
 */
export enum EEvaluatePageLabels {
  PAGE_TITLE = "Frontend Skills Assessment",
  PAGE_DESCRIPTION = "Test your React.js ecosystem knowledge with a comprehensive 60-question evaluation",
  RESUME_TITLE = "Resume Your Evaluation",
  RESUME_SUBTITLE = "Continue where you left off",
  PROGRESS_LABEL = "Progress",
  QUESTIONS_LABEL = "questions",
  RESUME_BUTTON = "Resume Evaluation",
  STARTED_LABEL = "Started",
  START_NEW_TITLE = "Start New Evaluation",
  CREATING_BUTTON = "Creating...",
  START_EVALUATION_BUTTON = "Start Evaluation",
  PAST_ATTEMPTS_TITLE = "Past Attempts",
  VIEW_RESULTS_BUTTON = "View Results",
  EMPTY_STATE_MESSAGE = "No attempts yet. Start your first evaluation to assess your frontend skills and identify areas for improvement.",
  COMPREHENSIVE_SKILL_ASSESSMENT = "Comprehensive skill assessment",
  COMPREHENSIVE_SKILL_DESCRIPTION = "Thorough evaluation covering all aspects of React.js development",
  PAUSE_AND_RESUME = "Pause and resume anytime",
  PAUSE_AND_RESUME_DESCRIPTION = "Your progress is saved across multiple sessions",
  UNLIMITED_ATTEMPTS = "Unlimited attempts",
  UNLIMITED_ATTEMPTS_DESCRIPTION = "Track your improvement over time with detailed analytics",
  EVALUATION_DESCRIPTION = "Test your React.js frontend development skills with a comprehensive evaluation covering core concepts, modern patterns, and real-world scenarios",
}

/**
 * Question card component labels
 */
export enum EQuestionCardLabels {
  SUBMITTING = "Submitting...",
  SUBMIT_ANSWER = "Submit Answer",
  EXPLANATION = "Explanation",
  LEARN_MORE = "Learn More",
  KEYBOARD_HINTS = "Press 1-4 to select, Enter to submit",
}

/**
 * Results hero labels
 */
export enum EResultsHeroLabels {
  OVERALL_SCORE = "Overall Score",
}

/**
 * Result tier type
 */
export type TResultTier = "expert" | "proficient" | "developing" | "getting_started";

/**
 * Results page labels
 */
export enum EResultsPageLabels {
  EXPERT_TIER = "Expert Tier",
  EXPERT_HEADLINE = "Outstanding mastery!",
  EXPERT_DESCRIPTION = "You nailed this attempt with interview-ready precision. Keep the momentum going!",
  PROFICIENT_TIER = "Proficient Tier",
  PROFICIENT_HEADLINE = "You're on track!",
  PROFICIENT_DESCRIPTION = "Great performance across core topics. A few focused reps will unlock the next tier.",
  DEVELOPING_TIER = "Developing Tier",
  DEVELOPING_HEADLINE = "Solid foundation!",
  DEVELOPING_DESCRIPTION = "You're building reliable instincts. Tackle the focus areas below to level up fast.",
  GETTING_STARTED_TIER = "Launch Tier",
  GETTING_STARTED_HEADLINE = "Every expert starts here!",
  GETTING_STARTED_DESCRIPTION = "Great first step. Follow the curated recommendations to build confidence quickly.",
  YOU_SCORED = "You scored {score}% on this attempt.",
}

/**
 * Weak areas panel labels
 */
export enum EWeakAreaLabels {
  NEEDS_FOCUS = "Needs Focus",
  GENERAL_MASTERY = "General mastery",
  CRITICAL_LEVEL = "Critical",
  HIGH_LEVEL = "High Priority",
  MEDIUM_LEVEL = "Medium Priority",
  AREAS_TO_IMPROVE = "Areas to Improve",
  FOCUS_ESSENTIALS = "Focus on the essentials first—each card includes targeted actions to raise your mastery.",
  TOP_OPPORTUNITIES = "Top opportunities",
  ACCURACY_LABEL = "Accuracy",
  GOAL_REACH_80 = "Goal: reach 80%+ with focused practice",
  DEEP_DIVE_GUIDANCE = "Deep dive guidance",
  MONITOR_LEVEL = "Monitor",
}

/**
 * Question review list labels
 */
export enum EQuestionReviewLabels {
  SECTION_TITLE = "Intelligent Question Review",
  SEARCH_PLACEHOLDER = "Search questions, explanations, or tags",
  ALL_TOPICS_OPTION = "All Topics",
  SHOW_ONLY_INCORRECT = "Show only incorrect",
  SORT_LABEL = "Sort:",
  ORDER_OPTION = "Order",
  DIFFICULTY_OPTION = "Difficulty",
  TOPIC_OPTION = "Topic",
  GROUP_LABEL = "Group:",
  NONE_OPTION = "None",
  TIP_MESSAGE = "Tip: Use search to find explanations, tags, or specific phrasing.",
  ALL_QUESTIONS_GROUP = "All Questions",
  QUESTION_PREFIX = "Question",
  CORRECT_LABEL = "Correct",
  INCORRECT_LABEL = "Incorrect",
  FILTERED_SUMMARY_TEMPLATE = "Showing {shown} of {filtered} filtered questions (total {total})",
  GROUP_STATS_TEMPLATE = "{incorrect} incorrect • {total} total",
}

/**
 * Evaluate API error messages
 */
export enum EEvaluateApiErrorMessages {
  UNAUTHORIZED = "Unauthorized",
  ATTEMPT_ID_REQUIRED = "Attempt ID is required",
  AUTHENTICATION_REQUIRED = "Authentication required",
  ATTEMPT_NOT_FOUND = "Attempt not found",
  ATTEMPT_NOT_COMPLETED = "Attempt not completed yet. Complete all 60 questions first.",
  FAILED_TO_CREATE_ATTEMPT = "Failed to create attempt",
  FAILED_TO_FETCH_ATTEMPTS = "Failed to fetch attempts",
  FAILED_TO_FETCH_QUESTIONS = "Failed to fetch attempt questions",
  FAILED_TO_SUBMIT_ANSWER = "Failed to submit answer",
  FAILED_TO_PAUSE_ATTEMPT = "Failed to pause attempt",
  FAILED_TO_FETCH_RESULTS = "Failed to fetch results",
  FAILED_TO_RECORD_ANSWER = "Failed to record answer",
  FAILED_TO_VERIFY_COMPLETION = "Failed to verify completion",
  FAILED_TO_UPDATE_ATTEMPT = "Failed to update attempt",
  FAILED_TO_QUERY_QUESTIONS = "Failed to query questions",
  FAILED_TO_RETRIEVE_CONTEXT = "Failed to retrieve context for question generation.",
  FAILED_TO_ASSIGN_QUESTION = "Failed to assign question",
  FAILED_TO_COUNT_QUESTIONS = "Failed to count questions",
  FAILED_TO_FIX_ATTEMPT = "Failed to fix attempt",
  FAILED_TO_UPDATE_ATTEMPT_STATUS = "Failed to update attempt status",
  INTERNAL_SERVER_ERROR = "Internal server error",
  INVALID_ANSWER_INDEX = "Invalid answer index",
  QUESTION_NOT_FOUND = "Question not found",
  ATTEMPT_ALREADY_COMPLETED = "Attempt already completed",
}

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

// Database row types for asked questions
export interface IAttemptQuestion {
  question_id: string;
  mcq_items?: {
    content_key?: string;
  };
}
