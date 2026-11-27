import { TAG_CATEGORY_LABELS } from '@/lib/tagCategories'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { NextResponse } from 'next/server'

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })
  const db = getSupabaseServiceRole()

  const body = await req.json().catch(() => null)

  const label = (body?.label as string | undefined)?.trim() ?? ''
  const slugInput = (body?.slug as string | undefined)?.trim() ?? ''
  const sort_order_raw = body?.sort_order

  if (!label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 })
  }

  const category = body?.category ?? null
  if (category !== null && (typeof category !== 'string' || !Object.hasOwn(TAG_CATEGORY_LABELS, category))) {
    return NextResponse.json({ error: 'Unknown filter group' }, { status: 400 })
  }

  const slug = slugInput ? slugify(slugInput) : slugify(label)

  // Default sort order if not provided
  const sort_order =
    typeof sort_order_raw === 'number'
      ? sort_order_raw
      : parseInt(String(sort_order_raw ?? ''), 10)

  const finalSortOrder = Number.isFinite(sort_order) ? sort_order : 100

  const ins = await db
    .from('tags')
    .insert([{ label, slug, category, sort_order: finalSortOrder }])
    .select('id, slug, label, sort_order')
    .single()

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ tag: ins.data })
}
