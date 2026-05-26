import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { title, description } = await req.json()
    if (!title) return NextResponse.json({ error: 'No title' }, { status: 400 })

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `DSLR food photograph, ${title}, shot on a Canon 5D, 50mm lens, f/1.8 aperture, natural side lighting from a window, plated on a white ceramic dish, garnished and styled by a professional food stylist, warm background, bokeh, photorealistic, no illustration, no cartoon, no drawing, real food photo`

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