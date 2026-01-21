import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

type Params = {
  params: Promise<{ playerId: string }>
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(request: NextRequest, { params }: Params) {
  const { playerId } = await params

  if (!uuidPattern.test(playerId)) {
    return NextResponse.json({ error: 'Invalid player id.' }, { status: 400 })
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

    const supabaseServiceRole = getSupabaseServiceRole()
    const objectPath = `players/${playerId}/avatar.${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseServiceRole.storage
      .from('images')
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data, error } = await supabaseServiceRole
      .from('players')
      .update({ avatar_path: objectPath })
      .eq('id', playerId)
      .select('avatar_path')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 })
    }

    const { data: publicData } = supabaseServiceRole.storage.from('images').getPublicUrl(objectPath)

    return NextResponse.json({
      avatar_path: data.avatar_path,
      public_url: publicData?.publicUrl ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload avatar.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
