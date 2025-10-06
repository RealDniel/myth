// app/api/send-invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"
import { createClient } from "@supabase/supabase-js"

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "")

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { email, groupId } = await req.json()

    if (!email || !groupId) {
      return NextResponse.json({ error: "Missing email or groupId" }, { status: 400 })
    }

    // Require Authorization header so we can record inviter
    const authHeader = req.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = authHeader.replace("Bearer ", "")

    // validate token using the service client (we could also use a client created with anon key but getting user from token is fine)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = userData.user

    // create invite record using admin client — match your schema: inviter_id, invited_email
    const { data: invite, error: insertError } = await supabaseAdmin
      .from("invites")
      .insert([
        {
          invited_email: email,
          group_id: groupId,
          inviter_id: user.id,
          accepted: false,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      const msg = insertError?.message ? String(insertError.message) : "Failed to create invite"
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // send email (best-effort)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invites/${invite.id}`
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || "no-reply@myth.app",
      subject: "You're invited to join a trip on MYTH!",
      text: `You have been invited to join a trip! Click here to accept: ${inviteUrl}`,
      html: `<p>You have been invited to join a trip! Click <a href="${inviteUrl}">here</a> to accept.</p>`,
    }

    try {
      await sgMail.send(msg)
    } catch (e) {
      console.warn("Failed sending email (non-fatal):", e)
    }

    return NextResponse.json({ invite })
  } catch (error) {
    console.error("Send invite error:", error)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
