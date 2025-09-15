// app/api/send-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { email, inviteId } = await req.json();

    const msg = {
      to: email,
      from: "mythmailer1234@gmail.com",
      subject: "You're invited to join a trip on MYTH!",
      text: `You have been invited to join a trip! Click here to accept: ${process.env.NEXT_PUBLIC_APP_URL}/accept-invite/${inviteId}`,
      html: `<p>You have been invited to join a trip! Click <a href="${process.env.NEXT_PUBLIC_APP_URL}/accept-invite/${inviteId}">here</a> to accept.</p>`,
    };

    await sgMail.send(msg);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
