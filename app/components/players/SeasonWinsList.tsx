export type SeasonWins = {
  id: string
  label: string
  wins: number
  yearStart?: number | null
  yearEnd?: number | null
}

type SeasonWinsListProps = {
  seasons: SeasonWins[]
}

export default function SeasonWinsList({ seasons }: SeasonWinsListProps) {
  return (
    <section className="season-wins" aria-label="Wins by Season">
      <div className="season-wins__header">
        <h2>Wins by Season</h2>
      </div>
      {seasons.length === 0 ? (
        <p className="season-wins__empty">No wins recorded yet.</p>
      ) : (
        <div className="season-wins__list" role="list">
          {seasons.map((season) => (
            <div key={season.id} className="season-wins__row" role="listitem">
              <div className="season-wins__label">{season.label}</div>
              <div className="season-wins__value">
                <span className="season-wins__value-number">{season.wins}</span>
                <span className="season-wins__value-label">Wins</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
