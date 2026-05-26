import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { title, description } = await req.json()
    if (!title) return NextResponse.json({ error: 'No title' }, { status: 400 })

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `A stunning professional food photograph of ${title}. Beautifully plated on elegant dishware, natural window lighting, shallow depth of field with soft bokeh, vibrant rich colors, appetizing and mouth-watering, styled like a high-end restaurant, photorealistic, 4K detail.`

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
    })

    const imageUrl = response.data[0].url
    return NextResponse.json({ url: imageUrl })
  } catch (err) {
    console.error('Image generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}