import { NextResponse } from 'next/server'
import { getAccountAccess } from '@/lib/auth/requireMember'
import { supabaseServer, supabaseServerForToken } from '@/lib/supabaseServer'

const columns = 'id,created_at,tournament_id,author_id,author_user_id,author_name,message,images'
const isSafeImage = (value: unknown) =>
  typeof value === 'string' &&
  (/^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value))

export async function GET() {
  const { data, error } = await supabaseServer.from('posts').select(columns).order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
}

async function save(req: Request, edit: boolean) {
  const access = await getAccountAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })
  if (!access.player && !(edit && access.role === 'admin')) {
    return NextResponse.json({ error: 'An active player membership is required.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const images: unknown = body?.images ?? []
  if (!Array.isArray(images) || !images.every(isSafeImage) || (!message && !images.length)) {
    return NextResponse.json({ error: 'Provide a message or valid images.' }, { status: 400 })
  }
  const posts = supabaseServerForToken(access.token).from('posts')
  let query
  if (edit) {
    if (!body?.id) return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 })
    query = posts.update({ message, images }).eq('id', body.id)
    if (access.role !== 'admin') query = query.eq('author_user_id', access.userId)
  } else {
    if (!access.player || !body?.tournament_id)
      return NextResponse.json({ error: 'Choose a tournament.' }, { status: 400 })
    query = posts.insert({
      message,
      images,
      tournament_id: body.tournament_id,
      author_id: access.player.id,
      author_name: access.player.display_name,
      author_user_id: access.userId,
    })
  }
  const { data, error } = await query.select(columns).maybeSingle()
  if (error)
    return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  if (!data) return NextResponse.json({ error: 'Post unavailable for editing.' }, { status: 404 })
  return NextResponse.json({ post: data })
}

export const POST = (req: Request) => save(req, false)
export const PATCH = (req: Request) => save(req, true)

export async function DELETE(req: Request) {
  const access = await getAccountAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })
  if (!access.player && access.role !== 'admin')
    return NextResponse.json({ error: 'Membership required.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 })
  let query = supabaseServerForToken(access.token).from('posts').delete().eq('id', body.id)
  if (access.role !== 'admin') query = query.eq('author_user_id', access.userId)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Post unavailable for deletion.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
