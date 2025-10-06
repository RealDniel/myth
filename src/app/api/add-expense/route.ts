import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

export async function POST(req: Request) {
  try {
  const body = await req.json()
  const { groupId, amount, note, title } = body

    if (!groupId || amount == null) {
      return NextResponse.json({ error: "groupId and amount are required" }, { status: 400 })
    }

    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")

    const { data: { user }, error: userErr } = await adminSupabase.auth.getUser(token)
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

    // Verify user is an active member of the group
    const { data: membership, error: memErr } = await adminSupabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .is("removed_at", null)
      .maybeSingle()

    if (memErr) {
      console.error("membership check error:", memErr)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    // insert expense
    const { data: expense, error: insertErr } = await adminSupabase
      .from("expenses")
      .insert([
        {
          group_id: groupId,
          user_id: user.id,
          amount,
          note: note || "",
          title: title || null,
        },
      ])
      .select()
      .single()

    if (insertErr) {
      console.error("insert expense error:", insertErr)
      return NextResponse.json({ error: insertErr.message || "Failed to add expense" }, { status: 500 })
    }
    // Also increment the group's savings_goal by the expense amount
    try {
      const { data: groupData, error: groupErr } = await adminSupabase
        .from("groups")
        .select("savings_goal")
        .eq("id", groupId)
        .single()

      if (!groupErr && groupData) {
        const current = Number(groupData.savings_goal || 0)
        const newGoal = current + Number(amount || 0)
        const { error: updateErr } = await adminSupabase
          .from("groups")
          .update({ savings_goal: newGoal })
          .eq("id", groupId)

        if (updateErr) console.error("Failed to update group savings_goal:", updateErr)
      }
    } catch (e) {
      console.error("Error updating group savings_goal:", e)
    }

    return NextResponse.json({ expense })
  } catch (err) {
    console.error("add-expense error:", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
