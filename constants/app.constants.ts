/**
 * Application constants from environment variables
 */

// Supabase credentials
export const NEXT_PUBLIC_SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY) as string;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
export const SUPABASE_RAG_BUCKET = "rag";

// Application URL
export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Dev-only: fallback user id to bypass auth during local development
export const DEV_DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEV_DEFAULT_USER_ID ?? "";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

// Feature flags
export const ENABLE_DYNAMIC_LABEL_RESOLUTION: boolean =
  String(process.env.ENABLE_DYNAMIC_LABEL_RESOLUTION ?? "true").toLowerCase() === "true";

// Toggle use of config rules; when false, only heuristics + LLM are used
export const ENABLE_LABEL_RULES: boolean = String(process.env.ENABLE_LABEL_RULES ?? "false").toLowerCase() === "true";

// Strictness for LLM fallback acceptance (0..1)
export const LABEL_RESOLVER_MIN_CONFIDENCE = 0.8;
