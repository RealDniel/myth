"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

interface NewGroupModalProps {
  userId: string
  onClose: () => void
  onGroupCreated: (group: { id: string; name: string; savings_goal: number; savings_curr: number }) => void
}

export default function NewGroupModal({ userId, onClose, onGroupCreated }: NewGroupModalProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name) {
      alert("Please enter a group name")
      return
    }

    setLoading(true)

    // Insert new group (no savings goal prompted; default to 0)
    const { data: newGroupData, error: insertError } = await supabase
      .from("groups")
      .insert([{ name, savings_goal: 0 }])
      .select()
      .single()

    if (insertError || !newGroupData) {
      console.error(insertError)
      alert("Error creating group")
      setLoading(false)
      return
    }

    // Add current user to group_members
    const { error: memberError } = await supabase.from("group_members").insert([
      { group_id: newGroupData.id, user_id: userId, role: "admin" },
    ])

    if (memberError) {
      console.error(memberError)
      alert("Error adding yourself to the group")
      setLoading(false)
      return
    }

    // normalize shape: ensure callers receive savings_goal and savings_curr
    onGroupCreated({
      id: newGroupData.id,
      name: newGroupData.name,
      savings_goal: newGroupData.savings_goal || 0,
      savings_curr: newGroupData.savings_curr || 0,
    })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-black border border-color-white rounded-xl p-6 w-96 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Create New Group</h2>

        <label className="block mb-2">
          Group Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-2 py-1 mt-1"
          />
        </label>

        {/* no savings goal prompt per UX request */}

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-[var(--primary1)] text-white rounded"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}
