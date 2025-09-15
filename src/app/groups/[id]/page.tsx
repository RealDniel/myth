"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

interface Group {
  id: string
  name: string
  savings_goal: number
  savings_curr: number
}

export default function GroupPage() {
  const { id } = useParams()
  const [group, setGroup] = useState<Group | null>(null)

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

  if (!group) return <div className="p-6">Loading...</div>

  return (
    <div className="mt-20 p-6">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p>Savings Goal: ${group.savings_goal}</p>
      <p>Current Progress: {group.savings_curr / group.savings_goal}%</p>

      <div className="mt-6">
        <button className="px-4 py-2 bg-[var(--primary2)] rounded">Invite Members</button>
        <button className="ml-2 px-4 py-2 bg-[var(--primary1)] text-white rounded">
          Add Expense
        </button>
      </div>
    </div>
  )
}
