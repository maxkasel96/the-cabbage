import type { ReactNode } from 'react'

export type PlayerBioProps = {
  name: string
  bio: string
  avatar?: ReactNode
  children?: ReactNode
}

export default function PlayerBio({ name, bio, avatar, children }: PlayerBioProps) {
  return (
    <section className="player-bio" aria-label={`Bio for ${name}`}>
      <div className="player-bio__header">
        <div className="player-bio__identity">
          {avatar ? <div className="player-bio__avatar">{avatar}</div> : null}
          <div>
            <div className="player-bio__eyebrow">Player Bio</div>
            <div className="player-bio__name">{name}</div>
          </div>
        </div>
        {children ? <div className="player-bio__extras">{children}</div> : null}
      </div>
      <p className="player-bio__text">{bio}</p>
    </section>
  )
}
