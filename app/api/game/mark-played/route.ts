import { requireAdmin } from '@/lib/navigation/requireAdmin'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getActiveTournamentId } from '@/lib/getActiveTournamentId'
import { getSupabaseServiceRole } from '@/lib/supabaseServiceRole'

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status })
  const db = getSupabaseServiceRole()

  const contentType = req.headers.get('content-type') ?? ''
  let gameId: string | undefined
  let winnerPlayerIdsRaw: unknown = []
  let participantPlayerIdsRaw: unknown = []
  let noteRaw: unknown
  let winImageFiles: File[] = []

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    gameId = (formData.get('gameId') as string | null) ?? undefined
    const winnersValue = formData.get('winnerPlayerIds')
    if (typeof winnersValue === 'string') {
      try {
        winnerPlayerIdsRaw = JSON.parse(winnersValue)
      } catch {
        winnerPlayerIdsRaw = []
      }
    }
    const participantsValue = formData.get('participantPlayerIds')
    if (typeof participantsValue === 'string') {
      try {
        participantPlayerIdsRaw = JSON.parse(participantsValue)
      } catch {
        participantPlayerIdsRaw = []
      }
    }
    noteRaw = formData.get('note')
    winImageFiles = formData.getAll('winImages').filter((file): file is File => file instanceof File)
  } else {
    const body = await req.json().catch(() => null)
    gameId = body?.gameId as string | undefined
    winnerPlayerIdsRaw =
      (body?.winnerPlayerIds as unknown) ??
      (body?.winnerPlayerId ? [body.winnerPlayerId] : [])
    participantPlayerIdsRaw =
      (body?.participantPlayerIds as unknown) ??
      (body?.participantPlayerId ? [body.participantPlayerId] : [])
    noteRaw = body?.note
  }
  const note =
    typeof noteRaw === 'string'
      ? noteRaw.trim().slice(0, 2000)
      : null

  if (!gameId || !uuidRegex.test(gameId)) {
    return NextResponse.json({ error: `Invalid gameId: ${gameId}` }, { status: 400 })
  }

  if (!Array.isArray(winnerPlayerIdsRaw)) {
    return NextResponse.json({ error: 'winnerPlayerIds must be an array' }, { status: 400 })
  }
  if (!Array.isArray(participantPlayerIdsRaw)) {
    return NextResponse.json({ error: 'participantPlayerIds must be an array' }, { status: 400 })
  }

  const winnerPlayerIds = Array.from(
    new Set(winnerPlayerIdsRaw.filter((x: unknown): x is string => typeof x === 'string' && uuidRegex.test(x)))
  )
  const participantPlayerIds = Array.from(
    new Set(
      participantPlayerIdsRaw.filter((x: unknown): x is string => typeof x === 'string' && uuidRegex.test(x))
    )
  )

  if (winImageFiles.length > 0 && winnerPlayerIds.length === 0) {
    return NextResponse.json({ error: 'Cannot attach an image without at least one winner.' }, { status: 400 })
  }

  const tournamentId = await getActiveTournamentId()
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  const uploadedPaths: string[] = []
  const uploadId = randomUUID()
  if (winImageFiles.some(file => !ALLOWED_TYPES[file.type] || file.size > MAX_FILE_SIZE)) {
    return NextResponse.json({ error: 'Choose PNG, JPEG, or WebP files up to 5MB each.' }, { status: 400 })
  }
  if (winImageFiles.length) {
    for (const winImageFile of winImageFiles) {
      const extension = ALLOWED_TYPES[winImageFile.type]
      const objectPath = `wins/${uploadId}/${randomUUID()}.${extension}`
      const buffer = Buffer.from(await winImageFile.arrayBuffer())

      const { error: uploadError } = await db.storage
        .from('images')
        .upload(objectPath, buffer, {
          contentType: winImageFile.type,
          upsert: true,
        })

      if (uploadError) {
        if (uploadedPaths.length) await db.storage.from('images').remove(uploadedPaths)
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      uploadedPaths.push(objectPath)
    }

  }

  const image = uploadedPaths.length > 1 ? JSON.stringify(uploadedPaths) : uploadedPaths[0] ?? null
  const { data: playId, error } = await db.rpc('save_tournament_result', {
    p_tournament: tournamentId, p_game: gameId, p_winners: winnerPlayerIds,
    p_participants: participantPlayerIds, p_note: note, p_image: image,
  })
  if (error) {
    if (uploadedPaths.length) await db.storage.from('images').remove(uploadedPaths)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, tournamentId, gameId, playId, winnerPlayerIds })
}
