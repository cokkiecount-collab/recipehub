'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function RecipePage() {
  const { id } = useParams()
  const [recipe, setRecipe] = useState(null as any)
  const [user, setUser] = useState(null as any)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null as any)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: recipe } = await supabase.from('recipes').select('*').eq('id', id).single()
      setRecipe(recipe)
      setForm(recipe)
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

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase.from('recipes').update({
      title: form.title,
      description: form.description,
      ingredients: form.ingredients,
      instructions: form.instructions,
      category: form.category,
      cook_time: form.cook_time,
    }).eq('id', id)
    if (!error) {
      setRecipe(form)
      setEditing(false)
    }
    setSaving(false)
  }

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const inputClass = "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800 bg-white placeholder-stone-300"

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>
  if (!recipe) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Opskrift ikke fundet</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-400 hover:text-stone-600 text-sm">← Tilbage</a>
        <div className="flex-1" />
        {!editing && (
          <>
            <button onClick={toggleSave} className={`rounded-xl px-4 py-2 text-sm font-medium border ${saved ? 'bg-green-900 text-white border-green-900' : 'bg-white text-green-900 border-green-900'}`}>
              {saved ? 'Gemt ✓' : 'Gem opskrift'}
            </button>
            {user && recipe.user_id === user.id && (
              <>
                <button onClick={() => setEditing(true)} className="text-stone-500 text-sm hover:text-stone-700 border border-stone-200 rounded-xl px-4 py-2">Rediger</button>
                <button onClick={deleteRecipe} className="text-red-400 text-sm hover:text-red-600">Slet</button>
              </>
            )}
          </>
        )}
        {editing && (
          <>
            <button onClick={saveEdit} disabled={saving} className="bg-green-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Gemmer...' : 'Gem ændringer'}
            </button>
            <button onClick={() => { setEditing(false); setForm(recipe) }} className="text-stone-400 text-sm hover:text-stone-600">Annuller</button>
          </>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover rounded-2xl mb-8" />}

        {!editing ? (
          <>
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
          </>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Titel</label>
              <input name="title" value={form.title} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beskrivelse</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass + " resize-none"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Kategori</label>
                <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                  <option value="">Vælg kategori</option>
                  <option>Aftensmad</option>
                  <option>Morgenmad</option>
                  <option>Frokost</option>
                  <option>Dessert</option>
                  <option>Snacks</option>
                  <option>Bagværk</option>
                  <option>Vegetar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Tilberedningstid</label>
                <input name="cook_time" value={form.cook_time} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Ingredienser</label>
              <textarea name="ingredients" value={form.ingredients} onChange={handleChange} rows={8} className={inputClass + " resize-none"} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Fremgangsmåde</label>
              <textarea name="instructions" value={form.instructions} onChange={handleChange} rows={10} className={inputClass + " resize-none"} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}