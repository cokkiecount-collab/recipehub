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
    try {
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

      if (allIngredients.length === 0) {
        alert('Ingen ingredienser fundet i madplanen')
        setImporting(false)
        return
      }

      // Brug Claude til at slå ingredienser sammen
      const res = await fetch('/api/merge-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: allIngredients })
      })
      const data = await res.json()

      if (data.error) {
        alert('Kunne ikke slå ingredienser sammen')
        setImporting(false)
        return
      }

      const merged: string[] = data.merged

      // Fjern dem der allerede er på listen
      const existing = items.map(i => i.item.toLowerCase())
      const toAdd = merged.filter(ing => {
        const clean = ing.toLowerCase().replace(/[\d.,]+\s*(g|kg|ml|l|dl|cl|spsk|tsk|stk|fed|blade|nip|bundt|pose|pakke|skive|stykke)\s*/gi, '').trim()
        return !existing.some(e => e.includes(clean) || clean.includes(e))
      })

      if (toAdd.length === 0) {
        alert('Alle ingredienser er allerede på listen!')
        setImporting(false)
        return
      }

      await supabase.from('shopping_list').insert(
        toAdd.map(item => ({ user_id: user.id, item, from_meal_plan: true }))
      )

      await loadItems(user.id)
    } catch (err) {
      alert('Noget gik galt — prøv igen')
    }