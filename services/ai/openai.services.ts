import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { AI_SERVICE_ERRORS } from "@/constants/generation.constants";

/**
 * Creates an OpenAI client instance with the configured API key.
 * Server-only; throws if API key is not available.
 */
export function createOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

/**
 * Extracts HTTP status code from an error object.
 * Handles both direct status properties and nested response.status properties.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const withStatus = error as { status?: number; response?: { status?: number } };
    if (typeof withStatus.status === "number") {
      return withStatus.status;
    }
    if (withStatus.response && typeof withStatus.response.status === "number") {
      return withStatus.response.status;
    }
  }
  return undefined;
}

/**
 * Converts various error types to a readable string message.
 * Handles Error instances, plain strings, and arbitrary objects.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return String(jsonError);
  }
}
