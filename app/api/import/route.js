import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  const { url } = await request.json()

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()

    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 15000)

    // Hent billede URL fra siden
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    let image_url = ogImage ? ogImage[1] : null

    // Upload billedet til vores eget storage
    if (image_url) {
      try {
        const imgRes = await fetch(image_url)
        const imgBuffer = await imgRes.arrayBuffer()
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        const fileName = `imported-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(fileName, imgBuffer, { contentType })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('recipe-images')
            .getPublicUrl(fileName)
          image_url = urlData.publicUrl
        }
      } catch {
        // Behold den originale URL hvis upload fejler
      }
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Du er en hjælper der udtrækker opskriftsinformation fra tekst. 
        
Udtræk følgende fra denne tekst og returner KUN valid JSON uden forklaring:
{
  "title": "opskriftens titel",
  "description": "kort beskrivelse",
  "ingredients": "ingredienser adskilt med linjeskift",
  "instructions": "fremgangsmåde adskilt med linjeskift",
  "cook_time": "tilberedningstid fx 30 min"
}

Tekst fra hjemmesiden:
${cleanHtml}`
      }]
    })

    const text = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return NextResponse.json({ ...data, image_url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Kunne ikke hente siden' }, { status: 500 })
  }
}