import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
import { DOMParser } from 'linkedom'

type PostPayload = {
  tournament_id?: string
  author_id?: string
  author_name?: string
  message?: string
  images?: string[]
}

const isSafeImageSource = (value: string) =>
  /^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(value)

const allowedRichTextTags = new Set(['A', 'B', 'BR', 'EM', 'I', 'LI', 'OL', 'P', 'S', 'STRONG', 'U', 'UL'])

const sanitizeRichText = (value: string) => {
  if (!value) return ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(value, 'text/html')
  const nodes = Array.from(doc.body.querySelectorAll('*'))

  nodes.forEach((node) => {
    if (!allowedRichTextTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes))
      return
    }

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      const isSafe = /^https?:\/\//i.test(href) || href.startsWith('mailto:')
      if (!isSafe) {
        node.removeAttribute('href')
      } else {
        node.setAttribute('rel', 'noreferrer noopener')
        node.setAttribute('target', '_blank')
      }
    }

    Array.from(node.attributes).forEach((attr) => {
      if (node.tagName === 'A' && (attr.name === 'href' || attr.name === 'rel' || attr.name === 'target')) {
        return
      }

      node.removeAttribute(attr.name)
    })
  })

  return doc.body.innerHTML
}

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
  const rawMessage = body?.message?.trim() ?? ''
  const message = sanitizeRichText(rawMessage).trim()
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
