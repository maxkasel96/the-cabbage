import Link from 'next/link'

export type PlayerCardProps = {
  id: string
  name: string
  isActive?: boolean
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export default function PlayerCard({ id, name, isActive }: PlayerCardProps) {
  const initials = getInitials(name) || '?'

  return (
    <Link href={`/players/${id}`} className="player-card" aria-label={`View ${name} win history`}>
      <div className="player-card__avatar">
        <span aria-hidden="true">{initials}</span>
      </div>
      <div className="player-card__content">
        <div className="player-card__name">{name}</div>
        {typeof isActive === 'boolean' && (
          <div
            className={`player-card__status ${isActive ? 'player-card__status--active' : 'player-card__status--inactive'}`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </div>
        )}
      </div>
      <span className="player-card__chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}
