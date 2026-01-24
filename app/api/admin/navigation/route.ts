import { NextResponse } from 'next/server'
import { navConfigSchema } from '@/lib/navigation/schema'
import { defaultNavConfig } from '@/lib/navigation/defaultConfig'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'main'

  const { data, error } = await supabaseServer
    .from('navigation_configs')
    .select('name, config')
    .eq('name', name)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const config = data?.config ?? defaultNavConfig
  const parsed = navConfigSchema.safeParse(config)

  if (!parsed.success) {
    return NextResponse.json({ name, config: defaultNavConfig })
  }

  return NextResponse.json({ name, config: parsed.data })
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'main'
  const body = await req.json().catch(() => null)
  const parsed = navConfigSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('navigation_configs')
    .upsert({ name, config: parsed.data }, { onConflict: 'name' })
    .select('name, config')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ name: data.name, config: data.config })
}
