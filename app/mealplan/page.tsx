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
  const [selectedDay, setSelectedDay] = useState(0)
  const [pickerTab, setPickerTab] = useState('opskrift')
  const [customMeal, setCustomMeal] = useState('')

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
  const dayNamesShort = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

  function formatDate(d: Date) {
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    const todayIndex = new Date().getDay()
    setSelectedDay(todayIndex === 0 ? 6 : todayIndex - 1)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('title')
      setRecipes(recipes || [])
      await loadMealPlan(user.id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (user) loadMealPlan(user.id)
  }, [weekOffset])

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

  async function addCustomMeal(date: string, mealType: string) {
    if (!customMeal.trim()) return
    await supabase.from('meal_plans').insert({
      user_id: user.id,
      planned_date: date,
      meal_type: mealType,
      custom_meal: customMeal.trim(),
    })
    await loadMealPlan(user.id)
    setShowPicker(null)
    setCustomMeal('')
  }

  async function removeFromMealPlan(id: string) {
    await supabase.from('meal_plans').delete().eq('id', id)
    await loadMealPlan(user.id)
  }

  function getMealsForDay(date: string) {
    return mealPlan.filter(m => m.planned_date === date)
  }

  function getMealTitle(meal: any) {
    return meal.custom_meal || meal.recipes?.title || ''
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

  const MealCard = ({ meal }: { meal: any }) => (
    <div className="bg-orange-50 rounded-xl p-2 group relative">
      <p className="text-xs text-orange-600 font-medium">{meal.meal_type}</p>
      <p
        className={`text-xs text-stone-700 font-medium leading-tight ${meal.recipe_id ? 'cursor-pointer hover:text-green-900' : ''}`}
        onClick={() => meal.recipe_id && (window.location.href = `/recipe/${meal.recipe_id}`)}
      >
        {getMealTitle(meal)}
        {meal.custom_meal && <span className="ml-1 text-stone-400">📖</span>}
      </p>
      <button
        onClick={() => removeFromMealPlan(meal.id)}
        className="absolute top-1 right-1 text-stone-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100"
      >✕</button>
    </div>
  )

  const MobileMealCard = ({ meal }: { meal: any }) => (
    <div className="bg-orange-50 rounded-xl p-3 flex items-center gap-3 group">
      {meal.recipes?.image_url && !meal.custom_meal && (
        <img src={meal.recipes.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      )}
      {meal.custom_meal && (
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-lg flex-shrink-0">📖</div>
      )}
      <p
        className={`text-sm text-stone-700 font-medium flex-1 ${meal.recipe_id ? 'cursor-pointer hover:text-green-900' : ''}`}
        onClick={() => meal.recipe_id && (window.location.href = `/recipe/${meal.recipe_id}`)}
      >
        {getMealTitle(meal)}
      </p>
      <button onClick={() => removeFromMealPlan(meal.id)} className="text-stone-300 hover:text-red-400 text-lg flex-shrink-0">✕</button>
    </div>
  )

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        <a href="/feed" className="text-stone-600 hover:text-stone-800 text-sm font-medium">← Feed</a>
        <h1 className="font-serif text-xl text-green-900">🗓 Madplan</h1>
        <div className="flex-1" />
        <a href="/shopping" className="border border-green-900 text-green-900 rounded-xl px-3 py-2 text-xs font-medium hover:bg-green-50">
          🛒 Indkøbsliste
        </a>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-4">

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white hover:bg-stone-50 text-stone-700 font-medium">← Forrige</button>
          <div className="flex-1 text-center">
            <span className="text-xs font-medium text-stone-600">
              {days[0].toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })} — {days[6].toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}
            </span>
          </div>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white hover:bg-stone-50 text-stone-700 font-medium">Næste →</button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs text-green-900 font-medium hover:underline">I dag</button>}
        </div>

        {/* MOBIL */}
        <div className="md:hidden">
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {days.map((day, i) => {
              const isToday = formatDate(new Date()) === formatDate(day)
              const hasMeals = getMealsForDay(formatDate(day)).length > 0
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${selectedDay === i ? 'bg-green-900 text-white border-green-900' : isToday ? 'border-green-400 text-green-700 bg-green-50' : 'border-stone-200 bg-white text-stone-600'}`}
                >
                  <span>{dayNamesShort[i]}</span>
                  <span className="text-base font-serif">{day.getDate()}</span>
                  {hasMeals && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${selectedDay === i ? 'bg-white' : 'bg-orange-400'}`} />}
                </button>
              )
            })}
          </div>

          {(() => {
            const day = days[selectedDay]
            const dateStr = formatDate(day)
            const meals = getMealsForDay(dateStr)
            const isToday = formatDate(new Date()) === dateStr
            return (
              <div className={`bg-white rounded-2xl border ${isToday ? 'border-green-400' : 'border-stone-200'} p-4`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-green-700' : 'text-stone-500'}`}>{dayNames[selectedDay]}</p>
                    <p className={`text-2xl font-serif ${isToday ? 'text-green-900' : 'text-stone-700'}`}>{day.getDate()} {day.toLocaleDateString('da-DK', { month: 'long' })}</p>
                  </div>
                  <button onClick={() => setShowPicker({ date: dateStr, mealType: 'Aftensmad' })} className="bg-green-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-800">
                    + Tilføj
                  </button>
                </div>
                {meals.length === 0 && <p className="text-stone-300 text-sm text-center py-6">Ingen måltider planlagt</p>}
                <div className="space-y-3">
                  {mealTypes.map(type => {
                    const typeMeals = meals.filter(m => m.meal_type === type)
                    if (typeMeals.length === 0) return null
                    return (
                      <div key={type}>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{type}</p>
                        <div className="space-y-2">
                          {typeMeals.map(meal => <MobileMealCard key={meal.id} meal={meal} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* DESKTOP */}
        <div className="hidden md:grid grid-cols-7 gap-3">
          {days.map((day, i) => {
            const dateStr = formatDate(day)
            const meals = getMealsForDay(dateStr)
            const isToday = formatDate(new Date()) === dateStr
            return (
              <div key={dateStr} className={`bg-white rounded-2xl border ${isToday ? 'border-green-400' : 'border-stone-200'} p-3 min-h-48`}>
                <div className="mb-3">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-green-700' : 'text-stone-500'}`}>{dayNames[i]}</p>
                  <p className={`text-lg font-serif ${isToday ? 'text-green-900' : 'text-stone-700'}`}>{day.getDate()}</p>
                </div>
                <div className="space-y-2 mb-3">
                  {meals.map(meal => <MealCard key={meal.id} meal={meal} />)}
                </div>
                <button onClick={() => setShowPicker({ date: dateStr, mealType: 'Aftensmad' })} className="w-full text-xs text-stone-500 hover:text-green-700 hover:bg-green-50 rounded-lg py-1 transition-colors font-medium">
                  + Tilføj
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-stone-800">Tilføj til madplan</h2>
              <button onClick={() => { setShowPicker(null); setCustomMeal(''); setPickerTab('opskrift') }} className="text-stone-500 hover:text-stone-700 font-medium">✕</button>
            </div>

            {/* Måltidstype */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {mealTypes.map(type => (
                <button key={type} onClick={() => setShowPicker({ ...showPicker, mealType: type })} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${showPicker.mealType === type ? 'bg-green-900 text-white border-green-900' : 'border-stone-200 text-stone-600'}`}>
                  {type}
                </button>
              ))}
            </div>

            {/* Faner: opskrift vs fritekst */}
            <div className="flex mb-4 border-b border-stone-200">
              <button onClick={() => setPickerTab('opskrift')} className={`flex-1 pb-2 text-sm font-medium ${pickerTab === 'opskrift' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-500'}`}>
                Fra app
              </button>
              <button onClick={() => setPickerTab('fritekst')} className={`flex-1 pb-2 text-sm font-medium ${pickerTab === 'fritekst' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-500'}`}>
                Skriv selv
              </button>
            </div>

            {pickerTab === 'opskrift' ? (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Søg opskrift..."
                  className="border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-800 text-stone-800 mb-3"
                />
                <div className="overflow-y-auto space-y-2">
                  {filteredRecipes.map(recipe => (
                    <div key={recipe.id} onClick={() => addToMealPlan(recipe, showPicker.date, showPicker.mealType)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 cursor-pointer border border-stone-100">
                      {recipe.image_url
                        ? <img src={recipe.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                      }
                      <div>
                        <p className="text-sm font-medium text-stone-800">{recipe.title}</p>
                        {recipe.category && <p className="text-xs text-stone-500">{recipe.category}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Navn på retten</label>
                  <input
                    value={customMeal}
                    onChange={e => setCustomMeal(e.target.value)}
                    placeholder="fx Lasagne fra kogebog..."
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800"
                    onKeyDown={e => e.key === 'Enter' && addCustomMeal(showPicker.date, showPicker.mealType)}
                  />
                </div>
                <button
                  onClick={() => addCustomMeal(showPicker.date, showPicker.mealType)}
                  disabled={!customMeal.trim()}
                  className="w-full bg-green-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  Tilføj til madplan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}