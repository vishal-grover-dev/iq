/**
 * Application constants from environment variables
 */

// Supabase credentials
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
export const SUPABASE_RAG_BUCKET = "rag";

// Application URL
export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL as string;

// Environment validation
if (!NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

if (!NEXT_PUBLIC_APP_URL) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_APP_URL");
}
