"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignUp() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleLogOut() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Login / Sign Up</h1>

      <input
        className="w-full border rounded p-2 mb-3"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full border rounded p-2 mb-3"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-500 mb-3">{error}</p>}

      <div className="flex gap-4">
        <button
          className="bg-[var(--primary1)] text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleLogin}
          disabled={loading}
        >
          Login
        </button>
        <button
          className="bg-[var(--primary3)] text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleSignUp}
          disabled={loading}
        >
          Sign Up
        </button>

        <button
          className="bg-[var(--primary2)] text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleLogOut}
          disabled={loading}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
