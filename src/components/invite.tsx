"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface InviteModalProps {
  groupId: string;
  inviterId: string;
  onClose: () => void;
}

export default function InviteModal({ groupId, inviterId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleInvite = async () => {
    if (!email) {
      setErrorMsg("Please enter an email");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Use server API to create invite and send email (server uses service role key)
      // Get current session so we can pass an Authorization header
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be signed in to invite people.");
      }

      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, groupId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send invite");
      }

      const body = await res.json();
      const invite = body.invite;

      if (!invite) throw new Error("Invite creation failed on server");

      setSuccessMsg(`Invite sent to ${email}!`);
      setEmail(""); // clear input
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-black border border-white rounded-xl p-6 w-96 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Invite Someone</h2>

        <label className="block mb-2">
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-2 py-1 mt-1"
            placeholder="user@example.com"
          />
        </label>

        {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}
        {successMsg && <p className="text-green-500 text-sm mb-2">{successMsg}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 bg-[var(--primary2)] rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-[var(--primary1)] text-white rounded"
            onClick={handleInvite}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
