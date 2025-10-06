import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const groupId = url.searchParams.get("groupId")
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })
    // quick diagnostics: ensure env vars are present and try a non-auth ping to the Supabase URL
    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    let ping: { ok: boolean; status?: number; error?: string } | null = null
    try {
      // attempt a simple fetch to the supabase root URL (no auth)
      const pingRes = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
      ping = { ok: true, status: pingRes.status }
    } catch (pingErr: any) {
      ping = { ok: false, error: pingErr?.message || String(pingErr) }
    }

    // now attempt the admin fetch
    const { data, error } = await adminSupabase
      .from("expenses")
      .select("*, profiles(email)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })

    if (error) {
      // return structured error details along with diagnostics
      return NextResponse.json({
        diagnostics: { hasSupabaseUrl, hasServiceKey, ping },
        error: { message: error.message, code: (error as any).code || null, details: (error as any).details || null },
      }, { status: 500 })
    }

    return NextResponse.json({ diagnostics: { hasSupabaseUrl, hasServiceKey, ping }, data })
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message || String(err) } }, { status: 500 })
  }
}
