'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Feed() {
  const [recipes, setRecipes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [user, setUser] = useState(null as any)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Alle')
  const [view, setView] = useState('grid')

  const categories = ['Alle', 'Aftensmad', 'Morgenmad', 'Frokost', 'Dessert', 'Snacks', 'Bagværk', 'Vegetar']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data } = await supabase.from('recipes').select('*').order('title', { ascending: true })
      setRecipes(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = [...recipes] as any[]
    if (search) result = result.filter((r: any) => r.title.toLowerCase().includes(search.toLowerCase()))
    if (category !== 'Alle') result = result.filter((r: any) => r.category === category)
    setFiltered(result)
  }, [search, category, recipes])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'.split('')

  function groupedByLetter() {
    const groups: any = {}
    filtered.forEach((r: any) => {
      const letter = r.title[0].toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(r)
    })
    return groups
  }

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <h1 className="font-serif text-2xl text-green-900">🍃 RecipeHub</h1>
        <div className="flex-1" />
        <a href="/add" className="bg-green-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-800">+ Tilføj</a>
        <a href="/mealplan" className="border border-green-900 text-green-900 rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-50">🗓 Madplan</a>
        <a href="/profile" className="text-stone-400 text-sm hover:text-stone-600">Min profil</a>
        <button onClick={logout} className="text-stone-400 text-sm hover:text-stone-600">Log ud</button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Søgning */}
        <div className="flex gap-3 mb-5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søg efter opskrift..."
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-800 bg-white text-stone-800"
          />
          <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white text-stone-500 hover:border-stone-400">
            {view === 'grid' ? '☰ Kartotek' : '⊞ Grid'}
          </button>
        </div>

        {/* Kategorier */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${category === cat ? 'bg-green-900 text-white border-green-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-stone-400">Ingen opskrifter fundet</p>
          </div>
        )}

        {/* Grid visning */}
        {view === 'grid' && filtered.length > 0 && (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {filtered.map((recipe: any) => (
              <div key={recipe.id} className="break-inside-avoid mb-4 bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/recipe/${recipe.id}`}>
                {recipe.image_url ? <img src={recipe.image_url} alt={recipe.title} className="w-full object-cover" /> : <div className="w-full h-40 bg-stone-100 flex items-center justify-center text-4xl">🍽️</div>}
                <div className="p-4">
                  <h2 className="font-serif text-base text-stone-800 mb-1">{recipe.title}</h2>
                  {recipe.cook_time && <p className="text-xs text-stone-400">⏱ {recipe.cook_time}</p>}
                  {recipe.category && <span className="inline-block mt-2 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{recipe.category}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kartotek visning */}
        {view === 'list' && filtered.length > 0 && (
          <div>
            {/* Alfabetisk navigation */}
            <div className="flex flex-wrap gap-1 mb-6">
              {alphabet.map(letter => {
                const groups = groupedByLetter()
                const hasLetter = !!groups[letter]
                return (
                  <a key={letter} href={hasLetter ? `#letter-${letter}` : undefined} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${hasLetter ? 'bg-green-900 text-white hover:bg-green-800' : 'bg-stone-100 text-stone-300'}`}>
                    {letter}
                  </a>
                )
              })}
            </div>

            {/* Grupperet liste */}
            {Object.entries(groupedByLetter()).map(([letter, items]: any) => (
              <div key={letter} id={`letter-${letter}`} className="mb-6">
                <h2 className="font-serif text-2xl text-green-900 mb-3 border-b border-stone-200 pb-2">{letter}</h2>
                <div className="space-y-2">
                  {items.map((recipe: any) => (
                    <div key={recipe.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => window.location.href = `/recipe/${recipe.id}`}>
                      {recipe.image_url ? <img src={recipe.image_url} alt={recipe.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>}
                      <div className="flex-1">
                        <h3 className="font-serif text-base text-stone-800">{recipe.title}</h3>
                        <div className="flex gap-2 mt-1">
                          {recipe.category && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{recipe.category}</span>}
                          {recipe.cook_time && <span className="text-xs text-stone-400">⏱ {recipe.cook_time}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}