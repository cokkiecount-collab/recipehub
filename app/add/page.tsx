'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AddRecipe() {
  const [user, setUser] = useState(null as any)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    category: '',
    cook_time: '',
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
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

  function handleChange(e) {
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
      cook_time: '',
    })
    if (data.image_url) setPreview(data.image_url)
  } catch {
    alert('Noget gik galt — prøv igen')
  }
  setImporting(false)
}
  function handleImage(e) {
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
    }

    const { error } = await supabase.from('recipes').insert({
      ...form,
      image_url,
      user_id: user.id,
    })

    if (error) {
      setMessage('Fejl: ' + error.message)
    } else {
      window.location.href = '/feed'
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <a href="/feed" className="text-stone-400 hover:text-stone-600 text-sm">← Tilbage</a>
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
              className="flex-1 border border-orange-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 bg-white"
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
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Billede</label>
          {preview && <img src={preview} className="w-full h-48 object-cover rounded-xl mb-3" />}
          <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-stone-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Titel *</label>
          <input name="title" value={form.title} onChange={handleChange} placeholder="fx Pasta carbonara" className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800" />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Beskrivelse</label>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Kort beskrivelse af opskriften..." rows={3} className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Kategori</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800">
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
            <input name="cook_time" value={form.cook_time} onChange={handleChange} placeholder="fx 30 min" className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Ingredienser</label>
          <textarea name="ingredients" value={form.ingredients} onChange={handleChange} placeholder="fx 200g pasta, 2 æg, 100g pancetta..." rows={5} className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 resize-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Fremgangsmåde</label>
          <textarea name="instructions" value={form.instructions} onChange={handleChange} placeholder="Beskriv trin for trin hvordan opskriften laves..." rows={8} className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-800 resize-none" />
        </div>

        {message && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{message}</p>}

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-800 disabled:opacity-50">
          {loading ? 'Gemmer...' : 'Gem opskrift'}
        </button>
      </div>
    </main>
  )
}