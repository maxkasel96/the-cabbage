import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

type PostPayload = {
  tournament_id?: string
  author_id?: string
  author_name?: string
  message?: string
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from('posts')
    .select('id, created_at, tournament_id, author_id, author_name, message')
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

  if (!tournament_id || !author_id || !author_name || !message) {
    return NextResponse.json({ error: 'tournament_id, author_id, author_name, and message are required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('posts')
    .insert([{ tournament_id, author_id, author_name, message }])
    .select('id, created_at, tournament_id, author_id, author_name, message')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ post: data })
}
