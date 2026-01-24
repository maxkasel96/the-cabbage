import { NextResponse } from 'next/server'
import { navConfigSchema } from '@/lib/navigation/schema'
import { defaultNavConfig } from '@/lib/navigation/defaultConfig'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

const isMissingNavigationTable = (message?: string | null) =>
  Boolean(message && message.includes("Could not find the table 'public.navigation_configs'"))

export async function GET(req: Request) {
  const auth = await requireAdmin(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'main'
  const supabaseServiceRole = getSupabaseServiceRole()

  const { data, error } = await supabaseServiceRole
    .from('navigation_configs')
    .select('name, config')
    .eq('name', name)
    .maybeSingle()

  if (error) {
    if (isMissingNavigationTable(error.message)) {
      return NextResponse.json({
        name,
        config: defaultNavConfig,
        warning: 'navigation_configs table is missing. Run the migration to persist changes.',
      })
    }
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

  const supabaseServiceRole = getSupabaseServiceRole()
  const { data, error } = await supabaseServiceRole
    .from('navigation_configs')
    .upsert({ name, config: parsed.data }, { onConflict: 'name' })
    .select('name, config')
    .single()

  if (error) {
    if (isMissingNavigationTable(error.message)) {
      return NextResponse.json(
        {
          error:
            'navigation_configs table is missing. Run the migration before saving navigation changes.',
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ name: data.name, config: data.config })
}
