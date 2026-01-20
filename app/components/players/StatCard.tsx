export type StatCardProps = {
  label: string
  value: number
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card" role="group" aria-label={label}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" aria-label={`${label}: ${value}`}>
        {value}
      </div>
    </div>
  )
}
