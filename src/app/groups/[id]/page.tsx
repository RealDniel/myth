"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import InviteModal from "@/components/invite"

interface Group {
  id: string
  name: string
  savings_goal: number
  savings_curr: number
}

interface Member {
  id: string
  email: string
  role: string
}

export default function GroupPage() {
  const { id } = useParams()
  const [group, setGroup] = useState<Group | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  // Fetch group info
  useEffect(() => {
    if (!id) return
    const fetchGroup = async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single()
      if (!error && data) setGroup(data)
    }
    fetchGroup()
  }, [id])

  // Fetch group members (active only)
  const fetchMembers = async () => {
    if (!id) return
    const { data, error } = await supabase
      .from("group_members")
      .select("user_id, role, profiles(email)")
      .eq("group_id", id)
      .is("removed_at", null) // only active members
    if (error) {
      console.error("Error fetching members:", error)
    } else {
      const formatted = data.map((m: any) => ({
        id: m.user_id,
        email: m.profiles?.email || "Unknown",
        role: m.role,
      }))
      setMembers(formatted)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [id])

  // Fetch current user's role in this group
  useEffect(() => {
    if (!id || !user) return
    const fetchUserRole = async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .is("removed_at", null) // only consider active membership
        .single()
      if (!error && data) setUserRole(data.role)
    }
    fetchUserRole()
  }, [id, user])

  // Remove a member (soft delete)
  const handleRemoveMember = async (memberId: string) => {
    if (!userRole || userRole === "member") return

    if (!confirm("Are you sure you want to remove this member?")) return

    const { error } = await supabase
      .from("group_members")
      .update({ removed_at: new Date() }) // soft delete
      .eq("group_id", id)
      .eq("user_id", memberId)
    if (error) {
      console.error("Failed to remove member:", error)
    } else {
      setMembers(members.filter((m) => m.id !== memberId))
    }
  }

  if (!group) return <div className="p-6">Loading...</div>

  return (
    <div className="mt-20 p-6">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p>Savings Goal: ${group.savings_goal}</p>
      <p>
        Current Progress: {Math.round((group.savings_curr / group.savings_goal) * 100)}%
      </p>

      <div className="mt-6">
        <button
          className="px-4 py-2 bg-[var(--primary2)] rounded"
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite Members
        </button>
        <button className="ml-2 px-4 py-2 bg-[var(--primary1)] rounded">
          Add Expense
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Members</h2>
        {members.length === 0 ? (
          <p className="text-gray-500">No members yet</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex justify-between items-center border-b border-gray-700 pb-1"
              >
                <span>{m.email}</span>
                <div>
                  {m.id !== user?.id && userRole !== "member" && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-sm mr-2 px-2 py-1 text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white transition"
                    >
                      Remove
                    </button>
                  )}
                  <span className="text-sm text-gray-400">{m.role}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isInviteModalOpen && user && (
        <InviteModal
          groupId={group.id}
          inviterId={user.id}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
    </div>
  )
}
