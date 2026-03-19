import { NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/requireMember'
import { ensureUserProfile, updateOwnUserProfile } from '@/lib/userProfiles'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export async function GET(req: Request) {
  const auth = await requireMember(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const profile = await ensureUserProfile(auth.user)
    return NextResponse.json({ profile, role: auth.role })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load your profile.' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  const auth = await requireMember(req)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const displayName = typeof body?.displayName === 'string' ? body.displayName : undefined
  const profileData = isPlainObject(body?.profileData) ? body.profileData : undefined

  if (displayName === undefined && profileData === undefined) {
    return NextResponse.json(
      { error: 'Provide displayName and/or profileData to update your profile.' },
      { status: 400 }
    )
  }

  try {
    const profile = await updateOwnUserProfile(auth.user, {
      display_name: displayName,
      profile_data: profileData,
    })

    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update your profile.' },
      { status: 500 }
    )
  }
}
