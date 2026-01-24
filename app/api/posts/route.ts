import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type PostPayload = {
  tournament_id?: string
  author_id?: string
  author_name?: string
  message?: string
  images?: string[]
}

const isSafeImageSource = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)


export async function GET() {
  const { data, error } = await supabaseServer
    .from('posts')
    .select('id, created_at, tournament_id, author_id, author_name, message, images')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: data ?? [] })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PostPayload | null

  const tournament_id = body?.tournament_id?.trim() ?? ''
  const author_id = body?.author_id?.trim() ?? ''
  const author_name = body?.author_name?.trim() ?? ''
  const message = body?.message?.trim() ?? ''
  const images = Array.isArray(body?.images) ? body.images.filter((image) => typeof image === 'string') : []
  const invalidImages = images.filter((image) => !isSafeImageSource(image))

  if (!tournament_id || !author_id || !author_name || (!message && images.length === 0)) {
    return NextResponse.json(
      { error: 'tournament_id, author_id, author_name, and message (or images) are required' },
      { status: 400 }
    )
  }

  if (invalidImages.length > 0) {
    return NextResponse.json({ error: 'One or more images were rejected.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('posts')
    .insert([{ tournament_id, author_id, author_name, message, images }])
    .select('id, created_at, tournament_id, author_id, author_name, message, images')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post: data })
}
