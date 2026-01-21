'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { getAvatarPublicUrl } from '@/lib/getAvatarPublicUrl'

type SeasonWin = {
  id: string
  label: string
  wins: number
  yearStart?: number | null
  yearEnd?: number | null
}

type PlayerBaseballCardProps = {
  player: {
    id: string
    display_name: string
    is_active: boolean
    avatar_path?: string | null
    card_path?: string | null
  }
  stats: {
    totalWins: number
    winsBySeason: SeasonWin[]
  }
}

const teamLabel = 'Cabbage League'

const getNameParts = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? 'Player'
  const last = parts.slice(1).join(' ')
  return { first, last }
}

const getInitials = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const placeholderBio =
  'A steady presence in the league who brings calm focus to every match. Always ready for the next showdown.'

const sampleWinsBySeason: SeasonWin[] = [
  { id: '2024-2025', label: '2024–2025', wins: 12, yearStart: 2024, yearEnd: 2025 },
  { id: '2023-2024', label: '2023–2024', wins: 18, yearStart: 2023, yearEnd: 2024 },
  { id: '2022-2023', label: '2022–2023', wins: 9, yearStart: 2022, yearEnd: 2023 },
  { id: '2021-2022', label: '2021–2022', wins: 14, yearStart: 2021, yearEnd: 2022 },
  { id: '2020-2021', label: '2020–2021', wins: 7, yearStart: 2020, yearEnd: 2021 },
  { id: '2019-2020', label: '2019–2020', wins: 11, yearStart: 2019, yearEnd: 2020 },
  { id: '2018-2019', label: '2018–2019', wins: 6, yearStart: 2018, yearEnd: 2019 },
  { id: '2017-2018', label: '2017–2018', wins: 10, yearStart: 2017, yearEnd: 2018 },
  { id: '2016-2017', label: '2016–2017', wins: 8, yearStart: 2016, yearEnd: 2017 },
  { id: '2015-2016', label: '2015–2016', wins: 13, yearStart: 2015, yearEnd: 2016 },
  { id: '2014-2015', label: '2014–2015', wins: 5, yearStart: 2014, yearEnd: 2015 },
  { id: '2013-2014', label: '2013–2014', wins: 16, yearStart: 2013, yearEnd: 2014 },
  { id: '2012-2013', label: '2012–2013', wins: 4, yearStart: 2012, yearEnd: 2013 },
  { id: '2011-2012', label: '2011–2012', wins: 9, yearStart: 2011, yearEnd: 2012 },
  { id: '2010-2011', label: '2010–2011', wins: 3, yearStart: 2010, yearEnd: 2011 },
  { id: '2009-2010', label: '2009–2010', wins: 2, yearStart: 2009, yearEnd: 2010 },
]

const sortSeasons = (seasons: SeasonWin[]) =>
  [...seasons].sort((a, b) => {
    const aScore = (a.yearStart ?? 0) * 10000 + (a.yearEnd ?? 0)
    const bScore = (b.yearStart ?? 0) * 10000 + (b.yearEnd ?? 0)
    if (aScore !== bScore) return bScore - aScore
    return b.label.localeCompare(a.label)
  })

export default function PlayerBaseballCard({ player, stats }: PlayerBaseballCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { first, last } = useMemo(() => getNameParts(player.display_name), [player.display_name])
  const avatarUrl = getAvatarPublicUrl(player.card_path ?? player.avatar_path)
  const initials = getInitials(player.display_name)
  const winsBySeason = useMemo(() => {
    const seasons = stats.winsBySeason.length > 0 ? stats.winsBySeason : sampleWinsBySeason
    return sortSeasons(seasons)
  }, [stats.winsBySeason])

  const handleToggle = () => {
    setIsFlipped((prev) => !prev)
  }

  return (
    <div className="relative w-full aspect-[3/4] [perspective:1400px]">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isFlipped}
        aria-label={`Flip card for ${player.display_name}`}
        className="absolute inset-0 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-background)]"
      >
        <span
          className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          <span
            className="absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-[22px] border-[6px] border-[#d6c8a5] bg-[#f6efdc] text-[color:var(--text-primary)] shadow-[0_18px_28px_rgba(24,32,18,0.25)] [backface-visibility:hidden]"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(230,222,198,0.9)), radial-gradient(circle at top, rgba(110,127,74,0.2), transparent 60%)',
            }}
          >
            <span className="flex items-center justify-between bg-[#2e3f2a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f3f5ec]">
              <span>{teamLabel}</span>
            </span>
            <span className="relative mx-4 mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-[18px] border-[3px] border-[#c8b68a] bg-[#e2d6b9] shadow-[inset_0_0_18px_rgba(44,46,34,0.25)]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`Avatar for ${player.display_name}`}
                  fill
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 25vw"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-[#2e3f2a] bg-[#f3f5ec] text-3xl font-black tracking-[0.1em] text-[#2e3f2a]">
                  {initials}
                </span>
              )}
            </span>
            <span className="mx-4 mb-4 mt-4 flex items-center justify-between gap-2 rounded-[14px] border-2 border-[#b8a67f] bg-[#f8f1de] px-4 py-3 text-left shadow-[0_8px_16px_rgba(44,46,34,0.15)]">
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-[#6e7f4a]">
                  Player Name
                </span>
                <span className="block text-xl font-black text-[#1c2518]">
                  {first}
                  {last ? <span className="block text-lg font-bold text-[#4a5a3c]">{last}</span> : null}
                </span>
              </span>
            </span>
          </span>

          <span
            className="absolute inset-0 flex h-full w-full flex-col rounded-[22px] border-[6px] border-[#d6c8a5] bg-[#f6efdc] px-5 py-6 text-[color:var(--text-primary)] shadow-[0_18px_28px_rgba(24,32,18,0.25)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,221,198,0.9)), repeating-linear-gradient(0deg, rgba(110,127,74,0.18), rgba(110,127,74,0.18) 1px, transparent 1px, transparent 24px)',
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6e7f4a]">
              Player Record
            </span>
            <span className="mt-2 text-3xl font-black text-[#1c2518] sm:text-4xl">
              {player.display_name}
            </span>
            <span className="mt-4 flex flex-1 flex-col gap-4">
              <span className="rounded-2xl border border-[#c8b68a] bg-[#f8f1de] px-4 py-4 shadow-[0_12px_20px_rgba(44,46,34,0.18)]">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.35em] text-[#6e7f4a]">
                  Total Wins
                </span>
                <span className="mt-2 block text-4xl font-black text-[#2e3f2a] sm:text-5xl">
                  {stats.totalWins}
                </span>
              </span>
              <span className="rounded-2xl border border-[#d7caa2] bg-[#fbf6e8] px-4 py-3 text-left shadow-[0_6px_14px_rgba(44,46,34,0.1)]">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6e7f4a]">
                  Bio
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#4a5a3c]">
                  {placeholderBio}
                </span>
              </span>
              <span className="rounded-2xl border border-[#c8b68a] bg-[#f8f1de] px-4 py-3 shadow-[0_10px_18px_rgba(44,46,34,0.15)]">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.35em] text-[#6e7f4a]">
                  Wins by Season
                </span>
                <span className="relative mt-3 block">
                  <span className="flex max-h-40 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1">
                    {winsBySeason.map((season, index) => (
                      <span
                        key={season.id}
                        className={`flex items-center justify-between rounded-xl px-2 py-1 text-sm text-[#1c2518] ${
                          index === 0 ? 'bg-[#eef4dd]' : ''
                        }`}
                      >
                        <span className="font-semibold">{season.label}</span>
                        <span className="inline-flex min-w-[44px] items-center justify-center rounded-full bg-[#dce8cd] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#2f4b23]">
                          {season.wins}
                        </span>
                      </span>
                    ))}
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-2xl bg-gradient-to-t from-[#f8f1de] to-transparent" />
                </span>
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  )
}
