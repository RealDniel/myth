// app/api/accept-invite/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // required

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inviteId, accessToken } = body;
    if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });
    if (!accessToken) return NextResponse.json({ error: "accessToken required" }, { status: 401 });

    // 1) Verify access token and get user
    const {
      data: { user },
      error: userErr,
    } = await adminSupabase.auth.getUser(accessToken);

    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid session / not signed in" }, { status: 401 });
    }

    // 2) Load invite
    const { data: invite, error: inviteErr } = await adminSupabase
      .from("invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    // 3) Validate invite email matches currently authenticated user's email
    if ((invite as any).invited_email.toLowerCase() !== (user.email || "").toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email. Please sign in with the invited email." },
        { status: 403 }
      );
    }

    // 4) Check if user was previously removed from this group
    const { data: prevMembership, error: prevErr } = await adminSupabase
      .from("group_members")
      .select("*")
      .eq("group_id", invite.group_id)
      .eq("user_id", user.id)
      .single();

    if (prevErr && (prevErr as any).code !== "PGRST116") {
      // if there's an unexpected error (not 'no rows'), fail
      console.error("error checking previous membership:", prevErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    if (prevMembership) {
      // If exists and removed_at set -> block rejoin
      if (prevMembership.removed_at) {
        return NextResponse.json(
          { error: "You were removed from this group and cannot rejoin using this link." },
          { status: 403 }
        );
      }

      // If exists and not removed -> already member
      return NextResponse.json({ ok: true, message: "You are already a member of this group." });
    }

    // 5) Add user to group_members (active membership)
    const { error: insertErr } = await adminSupabase.from("group_members").insert([
      { group_id: invite.group_id, user_id: user.id, role: "member", removed_at: null },
    ]);

    if (insertErr) {
      console.error("insertErr:", insertErr);
      return NextResponse.json({ error: "Failed to add to group" }, { status: 500 });
    }

    // 6) Mark invite as accepted = true
    const { error: updateErr } = await adminSupabase
      .from("invites")
      .update({ accepted: true })
      .eq("id", inviteId);

    if (updateErr) {
      console.error("updateErr:", updateErr);
      // not fatal — membership already created; still return success but log
    }

    return NextResponse.json({ ok: true, groupId: invite.group_id });
  } catch (err) {
    console.error("accept-invite error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
