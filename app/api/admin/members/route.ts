import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { getRoleFromUser } from '@/lib/auth/roles'
import { createClient, type User } from '@supabase/supabase-js'

const failure = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return failure(admin.message, admin.status)
  const db = getSupabaseServiceRole()
  const [players, memberships] = await Promise.all([
    db.from('players').select('id,display_name,is_active').order('display_name'),
    db.from('player_memberships').select('player_id,user_id,invited_email,is_active'),
  ])
  if (players.error || memberships.error) return failure('Unable to load the roster.', 500)
  const accounts: User[] = []
  for (let page = 1; ; page += 1) {
    const result = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (result.error) return failure('Unable to load accounts.', 500)
    accounts.push(...result.data.users)
    if (result.data.users.length < 200) break
  }
  return NextResponse.json({
    players: players.data,
    memberships: memberships.data,
    accounts: accounts.map((user) => ({
      id: user.id,
      email: user.email,
      role: getRoleFromUser(user),
      providers: user.identities?.map((identity) => identity.provider) ?? [],
      lastSignIn: user.last_sign_in_at,
    })),
    currentUserId: admin.user.id,
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return failure(admin.message, admin.status)
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body?.playerId !== 'string') {
    return failure('Choose a player and enter a valid email address.', 400)
  }
  const db = getSupabaseServiceRole()
  const { error } = await db.rpc('prepare_player_invitation', {
    p_player: body.playerId,
    p_email: email,
  })
  if (error?.code === '23505')
    return failure('This player or email already has a membership or a different invitation.', 409)
  if (error?.code === '22023') return failure('Choose an active roster player.', 400)
  if (error) return failure('Unable to save the invitation.', 500)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
  const mailer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error: mailError } = await mailer.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL('/auth/callback?next=/account/profile', origin).href },
  })
  if (mailError)
    return failure(
      'Invitation saved. Email delivery failed. Use Resend or ask the player to sign in with Google using the invited address.',
      502,
    )
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return failure(admin.message, admin.status)
  const body = await request.json().catch(() => null)
  const db = getSupabaseServiceRole()
  if (
    body?.action === 'role' &&
    typeof body.userId === 'string' &&
    ['standard', 'admin'].includes(body.role)
  ) {
    if (body.userId === admin.user.id) return failure('Another admin must change your role.', 409)
    const { error } = await db.auth.admin.updateUserById(body.userId, {
      app_metadata: { role: body.role },
    })
    if (error) return failure(error.message, 400)
  } else if (
    body?.action === 'active' &&
    typeof body.userId === 'string' &&
    typeof body.active === 'boolean'
  ) {
    if (body.userId === admin.user.id) return failure('Another admin must change your membership.', 409)
    const { error } = await db
      .from('player_memberships')
      .update({ is_active: body.active })
      .eq('user_id', body.userId)
      .select('player_id')
      .single()
    if (error) return failure('Unable to change this membership.', 409)
  } else {
    return failure('Invalid member update.', 400)
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin.ok) return failure(admin.message, admin.status)
  const body = await request.json().catch(() => null)
  if (typeof body?.playerId !== 'string') return failure('Choose a pending invitation.', 400)
  const { error } = await getSupabaseServiceRole()
    .from('player_memberships')
    .delete()
    .eq('player_id', body.playerId)
    .is('user_id', null)
    .select('player_id')
    .single()
  if (error) return failure('This invitation has already been accepted or cancelled.', 409)
  return NextResponse.json({ ok: true })
}
