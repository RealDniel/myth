// app/api/send-invite/route.ts
import { NextRequest, NextResponse } from "next/server"
import sgMail from "@sendgrid/mail"
import { createClient } from "@supabase/supabase-js"

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ needs service role key for inserts
)

export async function POST(req: NextRequest) {
  try {
    const { email, groupId } = await req.json()

    if (!email || !groupId) {
      return NextResponse.json(
        { success: false, error: "Missing email or groupId" },
        { status: 400 }
      )
    }

    // ✅ check auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // ✅ insert invite into DB
    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert({
        group_id: groupId,
        email,
        invited_by: user.id,
        accepted: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "Failed to create invite" },
        { status: 500 }
      )
    }

    // ✅ send email
    const msg = {
      to: email,
      from: "mythmailer1234@gmail.com",
      subject: "You're invited to join a trip on MYTH!",
      text: `You have been invited to join a trip! Click here to accept: ${process.env.NEXT_PUBLIC_APP_URL}/invites/${invite.id}`,
      html: `<p>You have been invited to join a trip! Click <a href="${process.env.NEXT_PUBLIC_APP_URL}/invites/${invite.id}">here</a> to accept.</p>`,
    }

    await sgMail.send(msg)

    return NextResponse.json({ success: true, invite })
  } catch (error) {
    console.error("Send invite error:", error)
    return NextResponse.json(
      { success: false, error: "Unexpected server error" },
      { status: 500 }
    )
  }
}
