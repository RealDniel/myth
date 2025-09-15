"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import NewGroupModal from "@/components/new_group"
import Link from "next/link"

interface Group {
  id: string
  name: string
  savings_goal: number
  savings_curr: number
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchGroups = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      // Step 1: Get group IDs the user belongs to
      const { data: membershipData, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)

      if (membershipError) {
        console.error(membershipError)
        setLoading(false)
        return
      }

      const groupIds = membershipData?.map((row) => row.group_id) || []

      if (groupIds.length === 0) {
        setGroups([])
        setLoading(false)
        return
      }

      // Step 2: Fetch groups by IDs
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)

      if (groupsError) {
        console.error(groupsError)
      } else {
        setGroups(groupsData || [])
      }

      setLoading(false)
    }

    fetchGroups()
  }, [])

  if (loading) return <p>Loading...</p>

  if (!user)
    return (
      <p className="mt-40 p-6 text-center text-xl">
        Please sign in to view your groups.
      </p>
    )

  const handleGroupCreated = (group: Group) => {
    setGroups((prev) => [...prev, group])
  }

  return (
    <div className="mt-40 p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <Link key={group.id} href={`/groups/${group.id}`}>
            <div className="h-64 rounded-xl border border-white bg-black p-4 shadow-sm hover:shadow-md transition cursor-pointer">
              <h2 className="text-xl font-bold mb-3">{group.name}</h2>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[var(--primary1)] h-2 rounded-full"
                  style={{
                    width: `${(group.savings_curr / group.savings_goal) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {Math.round((group.savings_curr / group.savings_goal) * 100)}% saved
              </p>
            </div>
          </Link>
        ))}

        {/* Add New Group Card */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl border-2 border-dashed border-white bg-black p-6 flex items-center justify-center h-64 cursor-pointer hover:bg-gray-500 transition"
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl text-white">+</span>
            <p className="mt-2 text-lg text-white">Add new group</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <NewGroupModal
          userId={user.id}
          onClose={() => setIsModalOpen(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </div>
  )
}
