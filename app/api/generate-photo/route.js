import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://epgtahifcphwjifxmxst.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { title, description, userId } = await req.json()
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
      output_format: 'jpeg',
    })

    // Get base64 image data
    const b64 = response.data[0].b64_json
    if (!b64) return NextResponse.json({ error: 'No image data' }, { status: 500 })

    // Convert base64 to buffer
    const buffer = Buffer.from(b64, 'base64')

    // Upload to Supabase storage
    const filename = `recipe-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('personal_recipes')
      .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('personal_recipes')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Image generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}