import Link from 'next/link'
import PlayerAvatar from './PlayerAvatar'

export type PlayerCardProps = {
  id: string
  name: string
  isActive?: boolean
  avatarPath?: string | null
}

export default function PlayerCard({ id, name, isActive, avatarPath }: PlayerCardProps) {
  return (
    <Link href={`/players/${id}`} className="player-card" aria-label={`View ${name} win history`}>
      <PlayerAvatar name={name} avatarPath={avatarPath} className="player-card__avatar" size={52} />
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
