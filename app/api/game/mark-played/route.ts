import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'
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
  const contentType = req.headers.get('content-type') ?? ''
  let gameId: string | undefined
  let winnerPlayerIdsRaw: unknown = []
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
    noteRaw = formData.get('note')
    winImageFiles = formData.getAll('winImages').filter((file): file is File => file instanceof File)
  } else {
    const body = await req.json().catch(() => null)
    gameId = body?.gameId as string | undefined
    winnerPlayerIdsRaw =
      (body?.winnerPlayerIds as unknown) ??
      (body?.winnerPlayerId ? [body.winnerPlayerId] : [])
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

  const winnerPlayerIds = Array.from(
    new Set(winnerPlayerIdsRaw.filter((x: unknown): x is string => typeof x === 'string' && uuidRegex.test(x)))
  )

  if (winImageFiles.length > 0 && winnerPlayerIds.length === 0) {
    return NextResponse.json({ error: 'Cannot attach an image without at least one winner.' }, { status: 400 })
  }

  const tournamentId = await getActiveTournamentId()
  if (!tournamentId) {
    return NextResponse.json({ error: 'No active tournament set.' }, { status: 400 })
  }

  // 1) Create (or re-use) play record for this game in this tournament
  // If you want to allow playing the same game multiple times in a tournament,
  // remove the unique index and use insert(). For now we keep one play per game.
  const playUpsert = await supabaseServer
    .from('plays')
    .upsert(
      [{ tournament_id: tournamentId, game_id: gameId }],
      { onConflict: 'tournament_id,game_id' }
    )
    .select('id')
    .single()

  if (playUpsert.error) {
    return NextResponse.json({ error: playUpsert.error.message }, { status: 500 })
  }

  const playId = playUpsert.data.id as string
  let winImageValue: string | null = null

  if (winImageFiles.length > 0) {
    const supabaseServiceRole = getSupabaseServiceRole()
    const uploadedPaths: string[] = []

    for (const winImageFile of winImageFiles) {
      const extension = ALLOWED_TYPES[winImageFile.type]
      if (!extension) {
        return NextResponse.json(
          { error: 'Invalid file type. Please upload a PNG, JPEG, or WebP image.' },
          { status: 400 }
        )
      }

      if (winImageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size must be 5MB or less.' }, { status: 400 })
      }

      const objectPath = `wins/${playId}/${randomUUID()}.${extension}`
      const buffer = Buffer.from(await winImageFile.arrayBuffer())

      const { error: uploadError } = await supabaseServiceRole.storage
        .from('images')
        .upload(objectPath, buffer, {
          contentType: winImageFile.type,
          upsert: true,
        })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      uploadedPaths.push(objectPath)
    }

    winImageValue = uploadedPaths.length === 1 ? uploadedPaths[0] : JSON.stringify(uploadedPaths)
  }

  // 2) Replace winners for this play (delete then insert)
  const del = await supabaseServer.from('game_winners').delete().eq('play_id', playId)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  if (winnerPlayerIds.length > 0) {
    const rows = winnerPlayerIds.map((playerId) => ({
      play_id: playId,
      player_id: playerId,
      ...(winImageValue ? { win_image: winImageValue } : {}),
    }))
    const ins = await supabaseServer.from('game_winners').insert(rows)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  // 3) Mark the game as played + store the note
  const upd = await supabaseServer
    .from('plays')
    .update({
      played_at: new Date().toISOString(),
      played_note: note,
    })
    .eq('id', playId)

  if (upd.error) {
    return NextResponse.json({ error: upd.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tournamentId, gameId, playId, winnerPlayerIds })
}
