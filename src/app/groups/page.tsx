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

interface Membership {
  group_id: string
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  useEffect(() => {
    let isMounted = true

    const fetchGroups = async (currentUser: any | null) => {
      setLoading(true)
      if (!currentUser) {
        setGroups([])
        setLoading(false)
        return
      }

      try {
        // Step 1: Get memberships (not removed)
        const { data: membershipData, error: membershipError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", currentUser.id)
          .is("removed_at", null)

        if (membershipError) {
          console.error("Error fetching memberships:", membershipError)
          setGroups([])
          setLoading(false)
          return
        }

        const groupIds = (membershipData as Membership[])?.map((row) => row.group_id) || []

        if (groupIds.length === 0) {
          setGroups([])
          setLoading(false)
          return
        }

        // Step 2: Fetch group details
        const { data: groupsData, error: groupsError } = await supabase.from("groups").select("*").in("id", groupIds)

        if (groupsError) {
          console.error("Error fetching groups:", groupsError)
          setGroups([])
        } else {
          if (isMounted) setGroups((groupsData as Group[]) || [])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    // initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      fetchGroups(currentUser)
    })

    // subscribe to auth changes so page updates when user signs in/out
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      fetchGroups(currentUser)
    })

    return () => {
      isMounted = false
      // unsubscribe
      listener?.subscription?.unsubscribe && listener.subscription.unsubscribe()
    }
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
    <div className="mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {groups.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center">
            <p className="text-center text-gray-400 mb-6">You don’t have any groups yet.</p>

            <div
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl border-2 border-dashed border-white bg-black p-6 flex items-center justify-center h-64 w-full max-w-md cursor-pointer hover:bg-gray-500 transition"
            >
              <div className="flex flex-col items-center">
                <span className="text-4xl text-white">+</span>
                <p className="mt-2 text-lg text-white">Add new group</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {groups.map((group) => {
              const percent =
                group.savings_goal > 0
                  ? Math.round(
                      (group.savings_curr / group.savings_goal) * 100
                    )
                  : 0

              return (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <div className="h-64 rounded-xl border border-white bg-black p-4 shadow-sm hover:shadow-md transition cursor-pointer">
                    <h2 className="text-xl font-bold mb-3">{group.name}</h2>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[var(--primary1)] h-2 rounded-full"
                        style={{
                          width: `${percent}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{percent}% saved</p>
                  </div>
                </Link>
              )
            })}

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
          </>
        )}
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
