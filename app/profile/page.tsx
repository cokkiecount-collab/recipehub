'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Profile() {
  const [user, setUser] = useState(null as any)
  const [myRecipes, setMyRecipes] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [tab, setTab] = useState('mine')
  const [filter, setFilter] = useState('alle')
  const [categoryFilter, setCategoryFilter] = useState('Alle')
  const [loading, setLoading] = useState(true)

  const categories = ['Alle', 'Aftensmad', 'Morgenmad', 'Frokost', 'Dessert', 'Snacks', 'Bagværk', 'Vegetar', 'Drinks', 'Fine dining', 'Syltning']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: mine } = await supabase.from('recipes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setMyRecipes(mine || [])
      const { data: saved } = await supabase.from('saved_recipes').select('*, recipes(*)').eq('user_id', user.id).order('created_at', { ascending: false })
      setSavedRecipes(saved?.map((s: any) => s.recipes) || [])
      setLoading(false)
    }
    load()
  }, [])

  // Skift kategorifilter nulstilles når man skifter tab
  function switchTab(t: string) {
    setTab(t)
    setCategoryFilter('Alle')
    setFilter('alle')
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function getFilteredRecipes() {
    let list: any[] = []
    if (tab === 'gemte') {
      list = savedRecipes as any[]
    } else {
      list = myRecipes as any[]
      if (filter === 'delte') list = list.filter((r: any) => r.is_public)
      if (filter === 'private') list = list.filter((r: any) => !r.is_public)
    }
    if (categoryFilter !== 'Alle') list = list.filter((r: any) => r.category === categoryFilter)
    return list
  }

  const recipes = getFilteredRecipes()

  if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400">Indlæser...</p></div>

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-4 py-4 flex items-center gap-3">
        <a href="/feed" className="text-stone-600 hover:text-stone-800 text-sm font-medium">← Feed</a>
        <h1 className="font-serif text-xl text-green-900">Min profil</h1>
        <div className="flex-1" />
        <button
          onClick={() => switchTab('gemte')}
          className="border border-green-900 text-green-900 rounded-xl px-3 py-2 text-xs font-medium hover:bg-green-50"
        >
          🔖 Gemte
        </button>
        <button onClick={logout} className="text-stone-600 text-sm font-medium hover:text-stone-800">Log ud</button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-lg font-medium text-orange-700">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-stone-800">{user?.email}</p>
            <p className="text-sm text-stone-500">{(myRecipes as any[]).length} opskrifter · {savedRecipes.length} gemte</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 border-b border-stone-200">
          <button onClick={() => switchTab('mine')} className={`px-6 pb-3 text-sm font-medium ${tab === 'mine' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-500'}`}>
            Mine opskrifter
          </button>
          <button onClick={() => switchTab('gemte')} className={`px-6 pb-3 text-sm font-medium ${tab === 'gemte' ? 'text-green-900 border-b-2 border-green-900' : 'text-stone-500'}`}>
            Gemte opskrifter
          </button>
        </div>

        {/* Filter til mine opskrifter */}
        {tab === 'mine' && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'alle', label: 'Alle' },
              { key: 'delte', label: '🌍 Delte' },
              { key: 'private', label: '🔒 Private' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.key ? 'bg-green-900 text-white border-green-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Kategorifilter — vises på begge tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryFilter === cat ? 'bg-green-900 text-white border-green-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}>
              {cat}
            </button>
          ))}
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400">
              {tab === 'mine'
                ? filter === 'delte' ? 'Du har ingen delte opskrifter endnu'
                : filter === 'private' ? 'Du har ingen private opskrifter endnu'
                : categoryFilter !== 'Alle' ? `Ingen opskrifter i kategorien "${categoryFilter}"`
                : 'Du har ingen opskrifter endnu'
                : categoryFilter !== 'Alle' ? `Ingen gemte opskrifter i kategorien "${categoryFilter}"`
                : 'Du har ingen gemte opskrifter endnu'}
            </p>
            {tab === 'mine' && <a href="/add" className="inline-block mt-4 bg-green-900 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-green-800">Tilføj opskrift</a>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recipes.map((recipe: any) => (
              <div key={recipe.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/recipe/${recipe.id}`}>
                <div className="relative">
                  {recipe.image_url
                    ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-40 object-cover" />
                    : <div className="w-full h-40 bg-stone-100 flex items-center justify-center text-4xl">🍽️</div>
                  }
                </div>
                <div className="p-4">
                  <h2 className="font-serif text-base text-stone-800 mb-1 line-clamp-2">{recipe.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {recipe.cook_time && <p className="text-xs text-stone-400">⏱ {recipe.cook_time}</p>}
                    {recipe.servings && <p className="text-xs text-stone-400">👤 {recipe.servings} pers.</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {recipe.category && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">{recipe.category}</span>}
                    {tab === 'mine' && (recipe.is_public ? <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">🌍 Delt</span> : <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-full">🔒 Privat</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}