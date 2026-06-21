'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MealPlan() {
  const [user, setUser] = useState(null as any)
  const [loading, setLoading] = useState(true)
  const [mealPlan, setMealPlan] = useState([] as any[])
  const [recipes, setRecipes] = useState([] as any[])
  const [showPicker, setShowPicker] = useState(null as any)
  const [search, setSearch] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  const mealTypes = ['Morgenmad', 'Frokost', 'Aftensmad', 'Snack']

  function getWeekDays() {
    const days = []
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }

  const days = getWeekDays()
  const dayNames = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']

  function formatDate(d: Date) {
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: recipes } = await supabase.from('recipes').select('*').order('title')
      setRecipes(recipes || [])
      await loadMealPlan(user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadMealPlan(userId: string) {
    const start = formatDate(days[0])
    const end = formatDate(days[6])
    const { data } = await supabase
      .from('meal_plans')
      .select('*, recipes(*)')
      .eq('user_id', userId)
      .gte('planned_date', start)
      .lte('planned_date', end)
    setMealPlan(data || [])
  }

  async function addToMealPlan(recipe: any, date: string, mealType: string) {
    await supabase.from('meal_plans').insert({
      user_id: user.id,
      recipe_id: recipe.id,
      planned_date: date,
      meal_type: mealType,
    })
    await loadMealPlan(user.id)
    setShowPicker(null)
    setSearch('')
  }

  async function removeFromMealPlan(id: string) {
    await supabase.from('meal_plans').delete().eq('id', id)
    await loadMealPlan(user.id)
  }

  function getMealsForDay(date: string) {
    return mealPlan.filter(m => m.planned_date === date)
  }

  function getShoppingList() {
    const items: string[] = []
    mealPlan.forEach(m => {
      if (m.recipes?.ingredients) {
        m.recipes.ingredients.split('\n').forEach((ing: string) => {
          if (ing.trim()) items.push(ing.trim())
        })
      }
    })
    return items
  }

  const filteredRecipes = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-400 hover:text-stone-600 text-sm">← Feed</a>
        <h1 className="font-serif text-2xl text-green-900">🗓 Madplan</h1>
        <div className="flex-1" />
        <button
          onClick={() => {
            const list = getShoppingList()
            if (list.length === 0) { alert('Ingen ingredienser i madplanen endnu'); return }
            alert('Indkøbsliste:\n\n' + list.join('\n'))
          }}
          className="border border-green-900 text-green-900 rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-50"
        >
          🛒 Indkøbsliste
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Uge navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="border border-stone-200 rounded-xl px-4 py-2 text-sm bg-white hover:bg-stone-50">← Forrige uge</button>
          <div className="flex-1 text-center">
            <span className="text-sm font-medium text-stone-600">
              {days[0].toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })} — {days[6].toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="border border-stone-200 rounded-xl px-4 py-2 text-sm bg-white hover:bg-stone-50">Næste uge →</button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-sm text-green-900 hover:underline">I dag</button>}
        </div>

        {/* Kalender grid */}
        <div className="grid grid-cols-7 gap-3">
          {days.map((day, i) => {
            const dateStr = formatDate(day)
            const meals = getMealsForDay(dateStr)
            const isToday = formatDate(new Date()) === dateStr

            return (
              <div key={dateStr} className={`bg-white rounded-2xl border ${isToday ? 'border-green-400' : 'border-stone-200'} p-3 min-h-48`}>
                <div className="mb-3">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-green-700' : 'text-stone-400'}`}>{dayNames[i]}</p>
                  <p className={`text-lg font-serif ${isToday ? 'text-green-900' : 'text-stone-700'}`}>{day.getDate()}</p>
                </div>

                <div className="space-y-2 mb-3">
                  {meals.map(meal => (
                    <div key={meal.id} className="bg-orange-50 rounded-xl p-2 group relative">
                      <p className="text-xs text-orange-600 font-medium">{meal.meal_type}</p>
                      <p className="text-xs text-stone-700 font-medium leading-tight cursor-pointer hover:text-green-900" onClick={() => window.location.href = `/recipe/${meal.recipe_id}`}>
                        {meal.recipes?.title}
                      </p>
                      <button
                        onClick={() => removeFromMealPlan(meal.id)}
                        className="absolute top-1 right-1 text-stone-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100"
                      >✕</button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowPicker({ date: dateStr, mealType: 'Aftensmad' })}
                  className="w-full text-xs text-stone-300 hover:text-green-700 hover:bg-green-50 rounded-lg py-1 transition-colors"
                >
                  + Tilføj
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opskrift picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-96 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-stone-800">Vælg opskrift</h2>
              <button onClick={() => setShowPicker(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <div className="flex gap-2 mb-4">
              {mealTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setShowPicker({ ...showPicker, mealType: type })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium ${showPicker.mealType === type ? 'bg-green-900 text-white border-green-900' : 'border-stone-200 text-stone-500'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søg opskrift..."
              className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-800 text-stone-800 mb-3"
            />

            <div className="overflow-y-auto space-y-2">
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => addToMealPlan(recipe, showPicker.date, showPicker.mealType)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 cursor-pointer border border-stone-100"
                >
                  {recipe.image_url
                    ? <img src={recipe.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                  }
                  <div>
                    <p className="text-sm font-medium text-stone-800">{recipe.title}</p>
                    {recipe.category && <p className="text-xs text-stone-400">{recipe.category}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}