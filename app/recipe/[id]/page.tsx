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
  const [servings, setServings] = useState(4)
  const [baseServings, setBaseServings] = useState(4)
  const [checkedIngredients, setCheckedIngredients] = useState(new Set())
  const [checkedSteps, setCheckedSteps] = useState(new Set())
  const [showMealPicker, setShowMealPicker] = useState(false)
  const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState('Aftensmad')
  const [mealAdded, setMealAdded] = useState(false)

  const mealTypes = ['Morgenmad', 'Frokost', 'Aftensmad', 'Snack']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: recipe } = await supabase.from('recipes').select('*').eq('id', id).single()
      setRecipe(recipe)
      setForm(recipe)
      const base = recipe?.servings || 4
      setBaseServings(base)
      setServings(base)
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

  async function addToMealPlan() {
    await supabase.from('meal_plans').insert({ user_id: user.id, recipe_id: id, planned_date: mealDate, meal_type: mealType })
    setShowMealPicker(false)
    setMealAdded(true)
    setTimeout(() => setMealAdded(false), 3000)
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
      servings: form.servings ? parseInt(form.servings) : null,
      is_public: form.is_public,
    }).eq('id', id)
    if (!error) {
      setRecipe(form)
      const newBase = form.servings ? parseInt(form.servings) : 4
      setBaseServings(newBase)
      setServings(newBase)
      setEditing(false)
    }
    setSaving(false)
  }

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function toggleIngredient(i: number) {
    const next = new Set(checkedIngredients)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setCheckedIngredients(next)
  }

  function toggleStep(i: number) {
    const next = new Set(checkedSteps)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setCheckedSteps(next)
  }

  function scaleAmount(text: string) {
    const ratio = servings / baseServings
    const fractions: any = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75, '⅛': 0.125 }
    function formatNum(n: number) {
      if (n === 0.5) return '½'
      if (n === 0.25) return '¼'
      if (n === 0.75) return '¾'
      if (n === 0.333 || n.toFixed(2) === '0.33') return '⅓'
      if (n === 0.667 || n.toFixed(2) === '0.67') return '⅔'
      if (n % 1 === 0) return n.toString()
      return n.toFixed(1).replace('.', ',')
    }
    text = text.replace(/(\d+)\/(\d+)/g, (_: string, a: string, b: string) => formatNum((parseInt(a) / parseInt(b)) * ratio))
    for (const [frac, val] of Object.entries(fractions)) {
      text = text.replace(new RegExp(frac, 'g'), formatNum(val * ratio))
    }
    text = text.replace(/(\d+([.,]\d+)?)/g, (match: string) => formatNum(parseFloat(match.replace(',', '.')) * ratio))
    return text
  }

  const inputClass = "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800 bg-white placeholder-stone-300"

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>
  if (!recipe) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Opskrift ikke fundet</p></div>

  const ingredients = recipe.ingredients ? recipe.ingredients.split('\n').filter((l: string) => l.trim()) : []
  const steps = recipe.instructions ? recipe.instructions.split('\n').filter((l: string) => l.trim()) : []
  const isOwner = user && recipe.user_id === user.id

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        <a href="/feed" className="text-stone-600 hover:text-stone-800 text-sm font-medium">← Tilbage</a>
        <div className="flex-1" />
        {editing && (
          <>
            <button onClick={saveEdit} disabled={saving} className="bg-green-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Gemmer...' : 'Gem ændringer'}
            </button>
            <button onClick={() => { setEditing(false); setForm(recipe) }} className="text-stone-600 text-sm font-medium hover:text-stone-800">Annuller</button>
          </>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="w-full h-64 object-cover rounded-2xl mb-6" />}

        {!editing ? (
          <>
            <h1 className="font-serif text-3xl text-stone-800 mb-3">{recipe.title}</h1>
            <div className="flex gap-2 flex-wrap mb-4">
              {recipe.category && <span className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full">{recipe.category}</span>}
              {recipe.cook_time && <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full">⏱ {recipe.cook_time}</span>}
              {recipe.is_public ? <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">🌍 Delt</span> : <span className="text-xs bg-stone-100 text-stone-500 px-3 py-1 rounded-full">🔒 Privat</span>}
            </div>

            <div className="flex gap-2 flex-wrap mb-6">
              <button onClick={toggleSave} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${saved ? 'bg-stone-100 text-stone-500 border-stone-200' : 'bg-green-900 text-white border-green-900 hover:bg-green-800'}`}>
                {saved ? '✓ Gemt' : 'Gem opskrift'}
              </button>
              <button onClick={() => setShowMealPicker(true)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors">
                {mealAdded ? '🗓 Tilføjet!' : '🗓 Madplan'}
              </button>
              {isOwner && <button onClick={() => setEditing(true)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">Rediger</button>}
              {isOwner && <button onClick={deleteRecipe} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Slet</button>}
            </div>

            {recipe.description && <p className="text-stone-600 mb-8">{recipe.description}</p>}

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-8 flex items-center gap-4">
              <span className="text-sm font-medium text-green-900">Antal personer</span>
              <div className="flex items-center gap-3 ml-auto">
                <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-8 h-8 rounded-full bg-green-900 text-white flex items-center justify-center text-lg font-medium hover:bg-green-800">−</button>
                <span className="text-lg font-medium text-green-900 w-6 text-center">{servings}</span>
                <button onClick={() => setServings(servings + 1)} className="w-8 h-8 rounded-full bg-green-900 text-white flex items-center justify-center text-lg font-medium hover:bg-green-800">+</button>
              </div>
            </div>

            {ingredients.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-stone-800">Ingredienser</h2>
                  {checkedIngredients.size > 0 && <button onClick={() => setCheckedIngredients(new Set())} className="text-xs text-stone-400 hover:text-stone-600">Nulstil</button>}
                </div>
                <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
                  {ingredients.map((ing: string, i: number) => (
                    <div key={i} onClick={() => toggleIngredient(i)} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-stone-50">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checkedIngredients.has(i) ? 'bg-green-900 border-green-900' : 'border-stone-300'}`}>
                        {checkedIngredients.has(i) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={`text-sm transition-colors ${checkedIngredients.has(i) ? 'line-through text-stone-300' : 'text-stone-700'}`}>{scaleAmount(ing)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-stone-800">Fremgangsmåde</h2>
                  {checkedSteps.size > 0 && <button onClick={() => setCheckedSteps(new Set())} className="text-xs text-stone-400 hover:text-stone-600">Nulstil</button>}
                </div>
                <div className="space-y-3">
                  {steps.map((step: string, i: number) => (
                    <div key={i} onClick={() => toggleStep(i)} className={`bg-white rounded-xl border px-5 py-4 cursor-pointer flex gap-4 items-start transition-colors ${checkedSteps.has(i) ? 'border-green-200 bg-green-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5 transition-colors ${checkedSteps.has(i) ? 'bg-green-900 text-white' : 'bg-stone-100 text-stone-500'}`}>
                        {checkedSteps.has(i) ? '✓' : i + 1}
                      </div>
                      <p className={`text-sm leading-relaxed transition-colors ${checkedSteps.has(i) ? 'text-stone-400' : 'text-stone-700'}`}>{step}</p>
                    </div>
                  ))}
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
            <div className="grid grid-cols-3 gap-4">
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
                <input name="cook_time" value={form.cook_time ?? ''} onChange={handleChange} placeholder="fx 30 min" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Antal personer</label>
                <input name="servings" type="number" min="1" value={form.servings ?? ''} onChange={handleChange} placeholder="fx 4" className={inputClass} />
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
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-800">Del med alle</p>
                <p className="text-xs text-stone-400 mt-0.5">Andre brugere kan se denne opskrift i deres feed</p>
              </div>
              <button onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${form.is_public ? 'bg-green-900' : 'bg-stone-200'}`} style={{ minWidth: '48px' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200" style={{ left: form.is_public ? '26px' : '2px' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showMealPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-lg text-stone-800">Tilføj til madplan</h2>
              <button onClick={() => setShowMealPicker(false)} className="text-stone-500 hover:text-stone-700 font-medium">✕</button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Dato</label>
              <input type="date" value={mealDate} onChange={e => setMealDate(e.target.value)} className={inputClass} />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Måltid</label>
              <div className="flex gap-2 flex-wrap">
                {mealTypes.map(type => (
                  <button key={type} onClick={() => setMealType(type)} className={`text-sm px-4 py-2 rounded-xl border font-medium ${mealType === type ? 'bg-green-900 text-white border-green-900' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addToMealPlan} className="w-full bg-green-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-800">
              Tilføj til madplan
            </button>
          </div>
        </div>
      )}
    </main>
  )
}