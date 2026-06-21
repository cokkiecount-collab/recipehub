'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function RecipePage() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null)
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)

      const { data: recipe } = await supabase.from('recipes').select('*').eq('id', id).single()
      setRecipe(recipe)

      const { data: saved } = await supabase.from('saved_recipes').select('*').eq('user_id', user.id).eq('recipe_id', id).single()
      setSaved(!!saved)

      setLoading(false)
    }
    load()
  }, [id])

  async function toggleSave() {
    if (saved) {
      await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', id)
      setSaved(false)
    } else {
      await supabase.from('saved_recipes').insert({ user_id: user.id, recipe_id: id })
      setSaved(true)
    }
  }

  async function deleteRecipe() {
    if (!confirm('Er du sikker på du vil slette denne opskrift?')) return
    await supabase.from('recipes').delete().eq('id', id)
    window.location.href = '/feed'
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>
  if (!recipe) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Opskrift ikke fundet</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-400 hover:text-stone-600 text-sm">← Tilbage</a>
        <div className="flex-1" />
        <button onClick={toggleSave} className={`rounded-xl px-4 py-2 text-sm font-medium border ${saved ? 'bg-green-900 text-white border-green-900' : 'bg-white text-green-900 border-green-900'}`}>
          {saved ? 'Gemt ✓' : 'Gem opskrift'}
        </button>
        {user && recipe.user_id === user.id && (
          <button onClick={deleteRecipe} className="text-red-400 text-sm hover:text-red-600">Slet</button>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover rounded-2xl mb-8" />}

        <div className="flex items-start justify-between mb-4">
          <h1 className="font-serif text-3xl text-stone-800">{recipe.title}</h1>
        </div>

        <div className="flex gap-3 mb-6">
          {recipe.category && <span className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full">{recipe.category}</span>}
          {recipe.cook_time && <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">⏱ {recipe.cook_time}</span>}
        </div>

        {recipe.description && <p className="text-stone-600 mb-8">{recipe.description}</p>}

        {recipe.ingredients && (
          <div className="mb-8">
            <h2 className="font-serif text-xl text-stone-800 mb-4">Ingredienser</h2>
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-stone-600 whitespace-pre-line text-sm leading-relaxed">{recipe.ingredients}</p>
            </div>
          </div>
        )}

        {recipe.instructions && (
          <div>
            <h2 className="font-serif text-xl text-stone-800 mb-4">Fremgangsmåde</h2>
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <p className="text-stone-600 whitespace-pre-line text-sm leading-relaxed">{recipe.instructions}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}