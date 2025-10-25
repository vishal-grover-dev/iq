import { cookies } from "next/headers";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value || cookieStore.get("sb:token")?.value;
  if (!accessToken) return null;
  try {
    // Create an ephemeral client with the access token to get the user
    const client = getSupabaseServiceRoleClient();
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
