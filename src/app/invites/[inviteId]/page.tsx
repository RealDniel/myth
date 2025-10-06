"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AcceptInvitePage() {
  const { inviteId } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")
  const [inviteInfo, setInviteInfo] = useState<any>(null)

  useEffect(() => {
    if (!inviteId) return

    const acceptInvite = async () => {
      setLoading(true)

      // get session instead of getUser
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user

      // if no logged-in user -> show message
      if (!user || !session) {
        // fetch invite info just for display
        const { data: invite } = await fetch(`/api/get-invite?inviteId=${inviteId}`).then((r) =>
          r.json()
        )
        setInviteInfo(invite)
        setStatus(
          `Please sign in as ${invite?.invited_email ?? "the invited email"} to accept this invite.`
        )
        setLoading(false)
        return
      }

      // logged-in user -> attempt to accept
      setStatus("Accepting invite...")
      const accessToken = session.access_token

      try {
        const res = await fetch("/api/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, accessToken }),
        })

        if (res.ok) {
          setStatus("Invite accepted! Redirecting...")
          router.push("/groups") // redirect after acceptance
        } else {
          // try parse JSON error body, be defensive
          let errBody: any = null
          try {
            errBody = await res.json()
          } catch (e) {
            // non-json response
            const text = await res.text().catch(() => "")
            setStatus(`Failed: ${text || "Unknown error"}`)
            setLoading(false)
            return
          }

          const msg = errBody?.error || errBody?.message || errBody?.detail || JSON.stringify(errBody)
          setStatus(`Failed: ${msg || "Unknown error"}`)
        }
      } catch (networkErr: any) {
        setStatus(`Failed: ${networkErr?.message || "Network error"}`)
      }

      setLoading(false)
    }

    acceptInvite()
  }, [inviteId, router])

  return (
    <div className="mt-20 p-6">
      <h1 className="text-xl font-bold mb-4">Accept Invite</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <p>{status}</p>
          {inviteInfo && !inviteInfo.accepted && (
            <p>
              This invite is for <b>{inviteInfo.invited_email}</b>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
