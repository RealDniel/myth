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
  const [expenses, setExpenses] = useState<any[]>([])
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [savings, setSavings] = useState<any[]>([])
  const [isAddSavingOpen, setIsAddSavingOpen] = useState(false)
  const [savingAmount, setSavingAmount] = useState("")
  const [savingNote, setSavingNote] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseNote, setExpenseNote] = useState("")
  const [expenseName, setExpenseName] = useState("")
  const [expensesError, setExpensesError] = useState<string | null>(null)

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

  // Fetch expenses for this group
  const fetchExpenses = async () => {
    try {
      if (!id) return
      setExpensesError(null)

      // fetch expenses first
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", id)
        .order("created_at", { ascending: false })

      if (expenseError) {
        console.error("Error fetching expenses:", expenseError)
        setExpensesError(expenseError?.message || JSON.stringify(expenseError))
        setExpenses([])
        return
      }

      const expensesArr = (expenseData || []) as any[]

      // batch fetch profile emails for the user_ids referenced in expenses
      const userIds = Array.from(new Set(expensesArr.map((e) => e.user_id).filter(Boolean)))
      let profilesMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds)

        if (profilesError) {
          console.warn("Error fetching profiles for expenses:", profilesError)
        } else if (profilesData) {
          profilesMap = (profilesData as any[]).reduce((acc: any, p: any) => {
            acc[p.id] = p.email
            return acc
          }, {})
        }
      }

      setExpenses(
        expensesArr.map((e) => ({
          id: e.id,
          title: e.title || null,
          amount: e.amount,
          note: e.note,
          userEmail: profilesMap[e.user_id] || "Unknown",
          created_at: e.created_at,
        }))
      )
    } catch (err: any) {
      console.error("Unexpected error fetching expenses:", err)
      setExpensesError(err?.message || String(err))
      setExpenses([])
    }
  }

  const fetchSavings = async () => {
    try {
      if (!id) return
      const { data, error } = await supabase
        .from("savings")
        .select("*")
        .eq("group_id", id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching savings:", error)
        return setSavings([])
      }

      const savingsArr = (data || []) as any[]
      const userIds = Array.from(new Set(savingsArr.map((s) => s.user_id).filter(Boolean)))
      let profilesMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds)

        if (profilesError) console.warn("Error fetching profiles for savings:", profilesError)
        else if (profilesData) profilesMap = (profilesData as any[]).reduce((acc: any, p: any) => {
          acc[p.id] = p.email
          return acc
        }, {})
      }

      setSavings(savingsArr.map((s) => ({ id: s.id, amount: s.amount, note: s.note, userId: s.user_id, userEmail: profilesMap[s.user_id] || "Unknown", created_at: s.created_at })))
    } catch (err) {
      console.error("Unexpected error fetching savings:", err)
      setSavings([])
    }
  }

  useEffect(() => {
    fetchMembers()
    fetchExpenses()
    fetchSavings()
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
      if (!error && data) {
        setUserRole(data.role)
      } else {
        // no active membership or an error -> clear role to avoid stale elevated privileges
        setUserRole(null)
      }
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

  const handleAddExpense = async () => {
    if (!expenseAmount) return
    const amt = Number(expenseAmount)
    if (Number.isNaN(amt) || amt <= 0) return alert("Enter a valid amount")

    if (!expenseName) return alert("Enter a name for the expense")

    // get session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return alert("You must be signed in to add expenses")

    const res = await fetch("/api/add-expense", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ groupId: id, amount: amt, note: expenseNote, title: expenseName }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || "Failed to add expense")
      return
    }

    const body = await res.json()
    // normalize inserted expense to match fetch shape
    const inserted = {
      id: body.expense.id,
      title: body.expense.title || null,
      amount: body.expense.amount,
      note: body.expense.note || null,
      userEmail: user?.email || "You",
      created_at: body.expense.created_at,
    }
    setExpenses((prev) => [inserted, ...prev])
    setExpenseAmount("")
    setExpenseNote("")
    setExpenseName("")
    setIsAddExpenseOpen(false)

    // update group's savings_goal in UI
    // fetch latest group data
    const { data: groupData, error: groupErr } = await supabase.from("groups").select("*").eq("id", id).single()
    if (!groupErr && groupData) setGroup(groupData)
  }

  if (!group) return <div className="p-6">Loading...</div>

  return (
    <div className="mt-20 p-6">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p>Savings Goal: ${group.savings_goal}</p>
      <p>
        Current Progress: {Math.round((group.savings_curr / group.savings_goal) * 100)}%
      </p>

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
        {userRole === "admin" && (
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-[var(--primary2)] rounded"
              onClick={() => setIsInviteModalOpen(true)}
            >
              Invite Members
            </button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-500">No expenses yet</p>
        ) : (
          <ul className="space-y-2">
            {expenses.map((e) => (
                <li key={e.id} className="flex justify-between items-center border-b border-gray-700 pb-1">
                  <div>
                    <div className="font-medium">{e.title || "Untitled"} — ${e.amount.toFixed(2)}</div>
                    {e.note && <div className="text-sm text-gray-400">{e.note}</div>}
                    <div className="text-xs text-gray-600">{e.userEmail}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-400">{new Date(e.created_at).toLocaleString()}</div>
                    {/* Remove expense available to any active member */}
                    {userRole && (
                      <button
                        onClick={async () => {
                          if (!confirm("Remove this expense?")) return
                          // call API
                          const sessionRes = await supabase.auth.getSession()
                          const token = sessionRes?.data?.session?.access_token
                          if (!token) return alert("You must be signed in")
                          const res = await fetch("/api/remove-expense", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ expenseId: e.id, groupId: id }),
                          })
                          if (!res.ok) {
                            const body = await res.json().catch(() => ({}))
                            return alert(body.error || "Failed to remove expense")
                          }
                          const body = await res.json()
                          setExpenses((prev) => prev.filter((x) => x.id !== e.id))
                          // update group's savings_goal
                          const { data: groupData, error: groupErr } = await supabase.from("groups").select("*").eq("id", id).single()
                          if (!groupErr && groupData) setGroup(groupData)
                        }}
                        className="text-sm ml-2 px-2 py-1 text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}

        {userRole && (
          <div className="mt-4">
            <button onClick={() => setIsAddExpenseOpen(true)} className="px-4 py-2 bg-[var(--primary3)] text-white rounded">Add Expense</button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2">Savings</h2>
        {savings.length === 0 ? (
          <p className="text-gray-500">No savings yet</p>
        ) : (
          <ul className="space-y-2">
            {savings.map((s) => (
              <li key={s.id} className="flex justify-between items-center border-b border-gray-700 pb-1">
                <div>
                  <div className="font-medium">${Number(s.amount).toFixed(2)}</div>
                  {s.note && <div className="text-sm text-gray-400">{s.note}</div>}
                  <div className="text-xs text-gray-600">{s.userEmail || "Unknown"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">{new Date(s.created_at).toLocaleString()}</div>
                  {userRole && (
                    <button
                      onClick={async () => {
                        if (!confirm("Remove this saving?")) return
                        const sessionRes = await supabase.auth.getSession()
                        const token = sessionRes?.data?.session?.access_token
                        if (!token) return alert("You must be signed in")
                        const res = await fetch("/api/remove-saving", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ savingId: s.id, groupId: id }),
                        })
                        if (!res.ok) {
                          const body = await res.json().catch(() => ({}))
                          return alert(body.error || "Failed to remove saving")
                        }
                        const body = await res.json()
                        setSavings((prev) => prev.filter((x) => x.id !== s.id))
                        const { data: groupData, error: groupErr } = await supabase.from("groups").select("*").eq("id", id).single()
                        if (!groupErr && groupData) setGroup(groupData)
                      }}
                      className="text-sm ml-2 px-2 py-1 text-red-500 border border-red-500 rounded hover:bg-red-500 hover:text-white transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {userRole && (
          <div className="mt-4">
            <button onClick={() => setIsAddSavingOpen(true)} className="px-4 py-2 bg-[var(--primary1)] text-white rounded">Add Saving</button>
          </div>
        )}
      </div>

      {isInviteModalOpen && user && (
        <InviteModal
          groupId={group.id}
          inviterId={user.id}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}

      {isAddExpenseOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-black border border-white rounded-xl p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Add Expense</h2>

            <label className="block mb-2">
              Name:
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                placeholder="Dinner, taxi, etc."
              />
            </label>

            <label className="block mb-2">
              Amount:
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                placeholder="10.50"
              />
            </label>

            <label className="block mb-2">
              Note (optional):
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                placeholder="For pizza"
              />
            </label>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-[var(--primary2)] rounded"
                onClick={() => setIsAddExpenseOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[var(--primary1)] text-white rounded"
                onClick={handleAddExpense}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddSavingOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-black border border-white rounded-xl p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Add Saving</h2>

            <label className="block mb-2">
              Amount:
              <input
                type="number"
                value={savingAmount}
                onChange={(e) => setSavingAmount(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                placeholder="10.50"
              />
            </label>

            <label className="block mb-2">
              Note (optional):
              <input
                type="text"
                value={savingNote}
                onChange={(e) => setSavingNote(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                placeholder="Leftover cash"
              />
            </label>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-[var(--primary2)] rounded"
                onClick={() => setIsAddSavingOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[var(--primary1)] text-white rounded"
                onClick={async () => {
                  if (!savingAmount) return alert("Enter an amount")
                  const amt = Number(savingAmount)
                  if (Number.isNaN(amt) || amt <= 0) return alert("Enter a valid amount")

                  const sessionRes = await supabase.auth.getSession()
                  const token = sessionRes?.data?.session?.access_token
                  if (!token) return alert("You must be signed in to add savings")

                  const res = await fetch("/api/add-saving", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ groupId: id, amount: amt, note: savingNote }),
                  })

                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    alert(body.error || "Failed to add saving")
                    return
                  }

                  const body = await res.json()
                  setSavings((prev) => [body.saving, ...prev])
                  setSavingAmount("")
                  setSavingNote("")
                  setIsAddSavingOpen(false)

                  const { data: groupData, error: groupErr } = await supabase.from("groups").select("*").eq("id", id).single()
                  if (!groupErr && groupData) setGroup(groupData)
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
