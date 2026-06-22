import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request) {
  const { ingredients } = await request.json()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Du er en hjælper der slår ingredienser sammen til en indkøbsliste.

Regler:
- Slå samme ingrediens sammen og læg mængder sammen (fx "2 tsk salt" + "1 tsk salt" = "3 tsk salt")
- Behold den mest præcise enhed (fx gram frem for stykker hvis begge nævnes)
- Hvis mængder ikke kan lægges sammen (fx "lidt salt" + "2 tsk salt"), skriv den største mængde
- Fjern ikke noget — slå kun ens ting sammen
- Returner KUN en JSON array med strings, ingen forklaring

Ingredienser:
${ingredients.join('\n')}

Returner kun: ["ingrediens 1", "ingrediens 2", ...]`
      }]
    })

    const text = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const merged = JSON.parse(clean)

    return NextResponse.json({ merged })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Kunne ikke slå ingredienser sammen' }, { status: 500 })
  }
}