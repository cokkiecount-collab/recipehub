'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function ShoppingList() {
  const [user, setUser] = useState(null as any)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([] as any[])
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      await loadItems(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadItems(userId: string) {
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('user_id', userId)
      .order('checked', { ascending: true })
      .order('created_at', { ascending: true })
    setItems(data || [])
  }

  async function addItem() {
    if (!newItem.trim()) return
    setAdding(true)
    await supabase.from('shopping_list').insert({ user_id: user.id, item: newItem.trim() })
    setNewItem('')
    await loadItems(user.id)
    setAdding(false)
  }

  async function toggleItem(id: string, checked: boolean) {
    await supabase.from('shopping_list').update({ checked: !checked }).eq('id', id)
    await loadItems(user.id)
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    await loadItems(user.id)
  }

  async function clearChecked() {
    await supabase.from('shopping_list').delete().eq('user_id', user.id).eq('checked', true)
    await loadItems(user.id)
  }

  async function importFromMealPlan() {
    setImporting(true)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const start = monday.toISOString().split('T')[0]
    const end = sunday.toISOString().split('T')[0]
    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('*, recipes(*)')
      .eq('user_id', user.id)
      .gte('planned_date', start)
      .lte('planned_date', end)
    if (!mealPlan || mealPlan.length === 0) {
      alert('Ingen opskrifter i madplanen denne uge')
      setImporting(false)
      return
    }
    const allIngredients: string[] = []
    mealPlan.forEach(m => {
      if (m.recipes?.ingredients) {
        m.recipes.ingredients.split('\n').forEach((ing: string) => {
          if (ing.trim()) allIngredients.push(ing.trim())
        })
      }
    })
    const existing = items.map(i => i.item.toLowerCase())
    const unique = allIngredients.filter(ing => {
      const clean = ing.toLowerCase().replace(/[\d.,]+\s*(g|kg|ml|l|dl|cl|spsk|tsk|stk|fed|blade|nip|bundt|pose|dase|pakke|skive|stykke)\s*/gi, '').trim()
      return !existing.some(e => e.includes(clean) || clean.includes(e))
    })
    if (unique.length === 0) {
      alert('Alle ingredienser er allerede på listen!')
      setImporting(false)
      return
    }
    await supabase.from('shopping_list').insert(
      unique.map(item => ({ user_id: user.id, item, from_meal_plan: true }))
    )
    await loadItems(user.id)
    setImporting(false)
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        <a href="/feed" className="text-stone-600 hover:text-stone-800 text-sm font-medium">← Feed</a>
        <h1 className="font-serif text-xl text-green-900">Indkøbsliste</h1>
        <div className="flex-1" />
        {checked.length > 0 && (
          <button onClick={clearChecked} className="text-xs text-red-400 hover:text-red-600 font-medium">Slet afkrydsede</button>
        )}
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Tilføj vare..."
            className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800 bg-white"
          />
          <button
            onClick={addItem}
            disabled={adding || !newItem.trim()}
            className="bg-green-900 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            Tilføj
          </button>
        </div>

        <button
          onClick={importFromMealPlan}
          disabled={importing}
          className="w-full border border-green-900 text-green-900 rounded-xl py-3 text-sm font-medium hover:bg-green-50 disabled:opacity-50"
        >
          {importing ? 'Henter...' : 'Hent ingredienser fra ugens madplan'}
        </button>

        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-stone-400 text-sm">Din indkøbsliste er tom</p>
            <p className="text-stone-300 text-xs mt-1">Tilføj varer eller hent fra madplanen</p>
          </div>
        )}

        {unchecked.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
            {unchecked.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleItem(item.id, item.checked)}
                  className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center flex-shrink-0 hover:border-green-700 transition-colors"
                />
                <span className="text-sm text-stone-700 flex-1">{item.item}</span>
                {item.from_meal_plan && <span className="text-xs text-stone-300">madplan</span>}
                <button onClick={() => deleteItem(item.id)} className="text-stone-200 hover:text-red-400 text-lg flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}

        {checked.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">I kurven ({checked.length})</p>
            <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
              {checked.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleItem(item.id, item.checked)}
                    className="w-6 h-6 rounded-full bg-green-900 border-2 border-green-900 flex items-center justify-center flex-shrink-0"
                  >
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <span className="text-sm text-stone-300 line-through flex-1">{item.item}</span>
                  <button onClick={() => deleteItem(item.id)} className="text-stone-200 hover:text-red-400 text-lg flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}