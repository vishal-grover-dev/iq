import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from "@/constants/app.constants";

const isBrowser = typeof window !== "undefined";

let cachedBrowserClient: SupabaseClient | undefined;
let cachedServiceRoleClient: SupabaseClient | undefined;

/**
 * Returns a singleton Supabase client for browser usage (anon key).
 * Persists session and auto-refreshes tokens by default.
 */
export function getSupabaseBrowserClient(options?: SupabaseClientOptions<any>): SupabaseClient {
  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
export function getSupabaseServiceRoleClient(options?: SupabaseClientOptions<any>): SupabaseClient {
  if (isBrowser) {
    throw new Error("getSupabaseServiceRoleClient must not be called in the browser");
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!cachedServiceRoleClient) {
    cachedServiceRoleClient = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
export function createSupabaseClientWithKey(supabaseKey: string, options?: SupabaseClientOptions<any>): SupabaseClient {
  return createClient(NEXT_PUBLIC_SUPABASE_URL, supabaseKey, options);
}
