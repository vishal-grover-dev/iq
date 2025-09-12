import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("ingestions")
      .select("id, status, error, created_at, metadata")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
