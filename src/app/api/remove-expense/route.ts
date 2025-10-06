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
    const { expenseId, groupId } = body

    if (!expenseId || !groupId) return NextResponse.json({ error: "expenseId and groupId required" }, { status: 400 })

    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")

    const { data: { user }, error: userErr } = await adminSupabase.auth.getUser(token)
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

    // verify active membership
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

    if (!membership) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })

    // delete the expense and return the deleted row
    const { data: deleted, error: delErr } = await adminSupabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("group_id", groupId)
      .select()
      .single()

    if (delErr) {
      console.error("delete expense error:", delErr)
      return NextResponse.json({ error: delErr.message || "Failed to delete expense" }, { status: 500 })
    }

    // adjust group's savings_goal by subtracting the deleted amount
    try {
      const amt = Number((deleted as any).amount || 0)
      const { data: groupData, error: groupErr } = await adminSupabase
        .from("groups")
        .select("savings_goal")
        .eq("id", groupId)
        .single()

      if (!groupErr && groupData) {
        const current = Number(groupData.savings_goal || 0)
        const newGoal = Math.max(0, current - amt)
        const { error: updateErr } = await adminSupabase
          .from("groups")
          .update({ savings_goal: newGoal })
          .eq("id", groupId)

        if (updateErr) console.error("Failed to update group savings_goal after delete:", updateErr)
      }
    } catch (e) {
      console.error("Error updating group after expense delete:", e)
    }

    return NextResponse.json({ ok: true, deleted })
  } catch (err) {
    console.error("remove-expense error:", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
