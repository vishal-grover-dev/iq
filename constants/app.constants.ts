/**
 * Application constants from environment variables
 */

// Supabase credentials
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
export const SUPABASE_RAG_BUCKET = "rag";

// Application URL
export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export const HF_URL = process.env.HF_URL ?? "";
export const HF_KEY = process.env.HF_KEY ?? "";

// Dev-only: fallback user id to bypass auth during local development
export const DEV_DEFAULT_USER_ID = process.env.DEV_DEFAULT_USER_ID ?? "";