import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  const { url } = await request.json()

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const html = await res.text()

    // Fjern scripts og styles så Claude får mindre at læse
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 15000)

    // Hent billede direkte fra HTML
    const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    const image_url = ogImage ? ogImage[1] : null

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