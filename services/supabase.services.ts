import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import { NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL } from "@/constants/app.constants";

const isBrowser = typeof window !== "undefined";

let cachedBrowserClient: SupabaseClient | undefined;
let cachedServiceRoleClient: SupabaseClient | undefined;

/**
 * Returns a singleton Supabase client for browser usage (anon key).
 * Persists session and auto-refreshes tokens by default.
 */
export function getSupabaseBrowserClient(options?: SupabaseClientOptions<"public">): SupabaseClient {
  if (!cachedBrowserClient) {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      NEXT_PUBLIC_SUPABASE_URL) as string | undefined;
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      NEXT_PUBLIC_SUPABASE_ANON_KEY) as string | undefined;
    if (!supabaseUrl) {
      throw new Error("Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env.local");
    }
    if (!anonKey) {
      throw new Error(
        "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in .env.local"
      );
    }
    cachedBrowserClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      ...options,
    });
  }
  return cachedBrowserClient;
}

/**
 * Returns a singleton Supabase client using the service role key.
 * Server-only. Throws if called in the browser.
 */
export function getSupabaseServiceRoleClient(options?: SupabaseClientOptions<"public">): SupabaseClient {
  if (isBrowser) {
    throw new Error("getSupabaseServiceRoleClient must not be called in the browser");
  }
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL) as
    | string
    | undefined;
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env.local");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!cachedServiceRoleClient) {
    cachedServiceRoleClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        // Never persist/refresh on server
        persistSession: false,
        autoRefreshToken: false,
      },
      ...options,
    });
  }
  return cachedServiceRoleClient;
}

/**
 * Creates a new Supabase client instance with a provided key.
 * Useful for ephemeral clients or custom headers.
 */
export function createSupabaseClientWithKey(
  supabaseKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient {
  return createClient(NEXT_PUBLIC_SUPABASE_URL, supabaseKey, options);
}
