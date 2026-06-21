'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Profile() {
  const [user, setUser] = useState(null as any)
  const [myRecipes, setMyRecipes] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [tab, setTab] = useState('mine')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)

      const { data: mine } = await supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setMyRecipes(mine || [])

      const { data: saved } = await supabase.from('saved_recipes').select('*, recipes(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      setSavedRecipes(saved?.map(s => s.recipes) || [])

      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const recipes = tab === 'mine' ? myRecipes : savedRecipes

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-400 hover:text-stone-600 text-sm">← Feed</a>
        <h1 className="font-serif text-2xl text-green-900">Min profil</h1>
        <div className="flex-1" />
        <button onClick={logout} className="text-stone-400 text-sm hover:text-stone-600">Log ud</button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-xl font-medium text-orange-700">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-stone-800">{user?.email}</p>
            <p className="text-sm text-stone-400">{myRecipes.length} opskrifter · {savedRecipes.length} gemte</p>
          </div>
        </div>

        <div className="flex mb-6 border-b border-stone-200">
          <button
            onClick={() => setTab('mine')}
            className={`px-6 pb-3 text-sm font-medium ${tab === 'mine' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-400'}`}
          >
            Mine opskrifter
          </button>
          <button
            onClick={() => setTab('gemte')}
            className={`px-6 pb-3 text-sm font-medium ${tab === 'gemte' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-400'}`}
          >
            Gemte opskrifter
          </button>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400">{tab === 'mine' ? 'Du har ingen opskrifter endnu' : 'Du har ingen gemte opskrifter endnu'}</p>
            {tab === 'mine' && <a href="/add" className="inline-block mt-4 bg-green-900 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-green-800">Tilføj opskrift</a>}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4">
            {recipes.map(recipe => (
              <div key={recipe.id} className="break-inside-avoid mb-4 bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/recipe/${recipe.id}`}>
                {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="w-full object-cover" />}
                {!recipe.image_url && <div className="w-full h-40 bg-stone-100 flex items-center justify-center text-4xl">🍽️</div>}
                <div className="p-4">
                  <h2 className="font-serif text-base text-stone-800 mb-1">{recipe.title}</h2>
                  {recipe.cook_time && <p className="text-xs text-stone-400">⏱ {recipe.cook_time}</p>}
                  {recipe.category && <span className="inline-block mt-2 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{recipe.category}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}