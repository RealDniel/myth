// app/api/get-invite/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const inviteId = url.searchParams.get("inviteId");
    if (!inviteId) return NextResponse.json({ error: "inviteId missing" }, { status: 400 });

    const { data: invite, error } = await adminSupabase.from("invites").select("id, invited_email, group_id, accepted").eq("id", inviteId).single();
    if (error) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    // only return non-sensitive fields
    return NextResponse.json({ id: invite.id, invited_email: invite.invited_email, accepted: invite.accepted });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
