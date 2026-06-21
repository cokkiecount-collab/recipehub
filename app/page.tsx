'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) window.location.href = '/feed'
    }
    checkSession()
  }, [])

  async function handleAuth() {
    setLoading(true)
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Tjek din email for at bekræfte din konto!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/feed'
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 w-full max-w-md">
        <h1 className="font-serif text-3xl text-green-900 mb-1">🍃 RecipeHub</h1>
        <p className="text-stone-500 text-sm mb-8">Gem og opdag opskrifter du elsker</p>
        <div className="flex mb-6 border-b border-stone-200">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 pb-3 text-sm font-medium ${!isSignUp ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-400'}`}
          >
            Log ind
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 pb-3 text-sm font-medium ${isSignUp ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-400'}`}
          >
            Opret konto
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="din@email.dk"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Adgangskode</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800"
            />
          </div>
          {message && (
            <p className={`text-sm p-3 rounded-xl ${message.includes('email') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
              {message}
            </p>
          )}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full bg-green-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Vent...' : isSignUp ? 'Opret konto' : 'Log ind'}
          </button>
        </div>
      </div>
    </main>
  )
}