'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AddRecipe() {
  const [user, setUser] = useState(null as any)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    category: '',
    cook_time: '',
    servings: '4',
  })
  const [image, setImage] = useState(null as any)
  const [preview, setPreview] = useState(null as any)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
    }
    load()
  }, [])

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleImport() {
    if (!importUrl) return
    setImporting(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      })
      const data = await res.json()
      if (data.error) { alert('Kunne ikke hente opskriften — prøv en anden side'); return }
      setForm({
        title: data.title || '',
        description: data.description || '',
        ingredients: data.ingredients || '',
        instructions: data.instructions || '',
        category: '',
        cook_time: data.cook_time || '',
        servings: '4',
      })
      if (data.image_url) setPreview(data.image_url)
    } catch {
      alert('Noget gik galt — prøv igen')
    }
    setImporting(false)
  }

  function handleImage(e: any) {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  async function handleSubmit() {
    if (!form.title) { setMessage('Titel er påkrævet'); return }
    setLoading(true)
    setMessage('')

    let image_url = null

    if (image) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, image)

      if (uploadError) {
        setMessage('Fejl ved upload af billede: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName)

      image_url = urlData.publicUrl
    } else if (preview && preview.startsWith('http')) {
      image_url = preview
    }

    const { error } = await supabase.from('recipes').insert({
      ...form,
      image_url,
      user_id: user.id,
      is_public: isPublic,
    })

    if (error) {
      setMessage('Fejl: ' + error.message)
    } else {
      window.location.href = '/feed'
    }

    setLoading(false)
  }

  const inputClass = "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 text-stone-800 bg-white placeholder-stone-300"

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-600 hover:text-stone-800 text-sm font-medium">← Tilbage</a>
        <h1 className="font-serif text-2xl text-green-900">Tilføj opskrift</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <p className="text-sm font-medium text-orange-800 mb-3">🔗 Importer fra link</p>
          <div className="flex gap-2">
            <input
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="fx https://www.arla.dk/opskrifter/..."
              className="flex-1 border border-orange-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 bg-white text-stone-800 placeholder-orange-300"
            />
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-orange-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {importing ? 'Henter...' : 'Hent'}
            </button>
          </div>
        </div>

        {/* Billede upload — tydeligt */}
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-2xl transition-colors ${preview ? 'border-green-300 bg-green-50' : 'border-stone-300 bg-white hover:border-green-400 hover:bg-green-50'}`}>
            {preview ? (
              <div className="relative">
                <img src={preview} className="w-full h-56 object-cover rounded-2xl" />
                <div className="absolute inset-0 bg-black bg-opacity-30 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">Klik for at skifte billede</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-3 text-2xl">📷</div>
                <p className="text-sm font-medium text-stone-700 mb-1">Tilføj et billede</p>
                <p className="text-xs text-stone-400">Klik her for at vælge et billede fra din enhed</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </label>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Titel *</label>
          <input name="title" value={form.title} onChange={handleChange} placeholder="fx Pasta carbonara" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beskrivelse</label>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Kort beskrivelse af opskriften..." rows={3} className={inputClass + " resize-none"} />
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
              <option>Drinks</option>
	      <option>Fine dining</option>
	      <option>Syltning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Tilberedningstid</label>
            <input name="cook_time" value={form.cook_time} onChange={handleChange} placeholder="fx 30 min" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Antal personer</label>
            <input name="servings" type="number" min="1" value={form.servings} onChange={handleChange} placeholder="4" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Ingredienser</label>
          <textarea name="ingredients" value={form.ingredients} onChange={handleChange} placeholder="fx 200g pasta, 2 æg, 100g pancetta..." rows={5} className={inputClass + " resize-none"} />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Fremgangsmåde</label>
          <textarea name="instructions" value={form.instructions} onChange={handleChange} placeholder="Beskriv trin for trin hvordan opskriften laves..." rows={8} className={inputClass + " resize-none"} />
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-800">Del med alle</p>
            <p className="text-xs text-stone-400 mt-0.5">Andre brugere kan se denne opskrift i deres feed</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${isPublic ? 'bg-green-900' : 'bg-stone-200'}`}
            style={{ minWidth: '48px' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isPublic ? '26px' : '2px' }}
            />
          </button>
        </div>

        {message && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{message}</p>}

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-800 disabled:opacity-50">
          {loading ? 'Gemmer...' : 'Gem opskrift'}
        </button>
      </div>
    </main>
  )
}