'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Feed() {
  const [recipes, setRecipes] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/' ; return }
      setUser(user)
      const { data } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
      setRecipes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <h1 className="font-serif text-2xl text-green-900">🍃 RecipeHub</h1>
        <div className="flex-1" />
        <a href="/add" className="bg-green-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-800">+ Tilføj opskrift</a>
<a href="/profile" className="text-stone-400 text-sm hover:text-stone-600">Min profil</a>        
<button onClick={logout} className="text-stone-400 text-sm hover:text-stone-600">Log ud</button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg mb-4">Ingen opskrifter endnu</p>
            <a href="/add" className="bg-green-900 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-green-800">Tilføj den første opskrift</a>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
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