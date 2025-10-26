/**
 * Mock attempt data fixtures for testing
 * Provides realistic attempt data in various states for test scenarios
 */

import { EAttemptStatus } from "@/types/evaluate.types";

/**
 * In-progress attempt with 10 questions answered
 */
export const mockInProgressAttempt10 = {
  id: "attempt-10-progress",
  user_id: "test-user-1",
  status: EAttemptStatus.InProgress,
  total_questions: 60,
  questions_answered: 10,
  correct_count: 7, // Hidden from user during attempt
  started_at: "2024-01-15T10:00:00Z",
  completed_at: null,
  metadata: {
    session_count: 1,
    pause_count: 0,
    time_spent_seconds: 450,
    last_session_at: "2024-01-15T10:07:30Z",
  },
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:07:30Z",
};

/**
 * In-progress attempt with 40 questions answered
 */
export const mockInProgressAttempt40 = {
  id: "attempt-40-progress",
  user_id: "test-user-1",
  status: EAttemptStatus.InProgress,
  total_questions: 60,
  questions_answered: 40,
  correct_count: 28, // Hidden from user during attempt
  started_at: "2024-01-15T14:00:00Z",
  completed_at: null,
  metadata: {
    session_count: 2,
    pause_count: 1,
    time_spent_seconds: 1800,
    last_session_at: "2024-01-15T14:30:00Z",
  },
  created_at: "2024-01-15T14:00:00Z",
  updated_at: "2024-01-15T14:30:00Z",
};

/**
 * Completed attempt with all 60 questions answered
 */
export const mockCompletedAttempt = {
  id: "attempt-completed",
  user_id: "test-user-1",
  status: EAttemptStatus.Completed,
  total_questions: 60,
  questions_answered: 60,
  correct_count: 45,
  started_at: "2024-01-14T09:00:00Z",
  completed_at: "2024-01-14T10:15:00Z",
  metadata: {
    session_count: 1,
    pause_count: 0,
    time_spent_seconds: 4500,
    last_session_at: "2024-01-14T10:15:00Z",
  },
  created_at: "2024-01-14T09:00:00Z",
  updated_at: "2024-01-14T10:15:00Z",
};

/**
 * Multiple completed attempts for history testing
 */
export const mockCompletedAttempts = [
  {
    id: "attempt-1-completed",
    user_id: "test-user-1",
    status: EAttemptStatus.Completed,
    total_questions: 60,
    questions_answered: 60,
    correct_count: 42,
    started_at: "2024-01-10T09:00:00Z",
    completed_at: "2024-01-10T10:20:00Z",
    metadata: {
      session_count: 1,
      pause_count: 0,
      time_spent_seconds: 4800,
      last_session_at: "2024-01-10T10:20:00Z",
    },
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-10T10:20:00Z",
  },
  {
    id: "attempt-2-completed",
    user_id: "test-user-1",
    status: EAttemptStatus.Completed,
    total_questions: 60,
    questions_answered: 60,
    correct_count: 48,
    started_at: "2024-01-12T14:00:00Z",
    completed_at: "2024-01-12T15:10:00Z",
    metadata: {
      session_count: 2,
      pause_count: 1,
      time_spent_seconds: 4200,
      last_session_at: "2024-01-12T15:10:00Z",
    },
    created_at: "2024-01-12T14:00:00Z",
    updated_at: "2024-01-12T15:10:00Z",
  },
  {
    id: "attempt-3-completed",
    user_id: "test-user-1",
    status: EAttemptStatus.Completed,
    total_questions: 60,
    questions_answered: 60,
    correct_count: 52,
    started_at: "2024-01-14T11:00:00Z",
    completed_at: "2024-01-14T12:05:00Z",
    metadata: {
      session_count: 1,
      pause_count: 0,
      time_spent_seconds: 3900,
      last_session_at: "2024-01-14T12:05:00Z",
    },
    created_at: "2024-01-14T11:00:00Z",
    updated_at: "2024-01-14T12:05:00Z",
  },
];

/**
 * Attempt with gaps (for testing fix functionality)
 */
export const mockAttemptWithGaps = {
  id: "attempt-with-gaps",
  user_id: "test-user-1",
  status: EAttemptStatus.Completed,
  total_questions: 60,
  questions_answered: 45, // Only 45 questions assigned instead of 60
  correct_count: 32,
  started_at: "2024-01-13T10:00:00Z",
  completed_at: "2024-01-13T11:30:00Z",
  metadata: {
    session_count: 1,
    pause_count: 0,
    time_spent_seconds: 5400,
    last_session_at: "2024-01-13T11:30:00Z",
  },
  created_at: "2024-01-13T10:00:00Z",
  updated_at: "2024-01-13T11:30:00Z",
};

/**
 * Fresh attempt for new user testing
 */
export const mockNewAttempt = {
  id: "attempt-new",
  user_id: "test-user-new",
  status: EAttemptStatus.InProgress,
  total_questions: 60,
  questions_answered: 0,
  correct_count: 0,
  started_at: new Date().toISOString(),
  completed_at: null,
  metadata: {
    session_count: 1,
    pause_count: 0,
    time_spent_seconds: 0,
    last_session_at: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Attempts summary for landing page testing
 */
export const mockAttemptsSummary = {
  attempts: [mockInProgressAttempt10, ...mockCompletedAttempts],
};

/**
 * Empty attempts summary for first-time user
 */
export const mockEmptyAttemptsSummary = {
  attempts: [],
};
