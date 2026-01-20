import type { ReactNode } from 'react'

export type PlayerBioProps = {
  name: string
  bio: string
  children?: ReactNode
}

export default function PlayerBio({ name, bio, children }: PlayerBioProps) {
  return (
    <section className="player-bio" aria-label={`Bio for ${name}`}>
      <div className="player-bio__header">
        <div>
          <div className="player-bio__eyebrow">Player Bio</div>
          <div className="player-bio__name">{name}</div>
        </div>
        {children ? <div className="player-bio__extras">{children}</div> : null}
      </div>
      <p className="player-bio__text">{bio}</p>
    </section>
  )
}
