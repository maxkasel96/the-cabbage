import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/requireMember'
import { getEditableAccountProfileFields } from '@/lib/accountProfileFields'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'
import { ensureUserProfile, updateOwnUserProfile } from '@/lib/userProfiles'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest) {
  const auth = await requireMember(request)

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 })
    }

    const extension = ALLOWED_TYPES[file.type]
    if (!extension) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PNG, JPEG, or WebP image.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be 5MB or less.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceRole()
    const currentProfile = await ensureUserProfile(auth.user)
    const currentFields = getEditableAccountProfileFields(currentProfile.profile_data)
    const objectPath = `profiles/${auth.user.id}/profile-${Date.now()}.${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from('images').upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    try {
      const profile = await updateOwnUserProfile(auth.user, {
        profile_data: {
          ...currentProfile.profile_data,
          profileImagePath: objectPath,
        },
      })

      if (currentFields.profileImagePath && currentFields.profileImagePath !== objectPath) {
        await supabase.storage.from('images').remove([currentFields.profileImagePath])
      }

      return NextResponse.json({
        profile,
        profileImagePath: objectPath,
      })
    } catch (error) {
      await supabase.storage.from('images').remove([objectPath])
      throw error
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile image.' },
      { status: 500 }
    )
  }
}
