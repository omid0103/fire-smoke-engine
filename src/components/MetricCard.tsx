import type { LucideIcon } from 'lucide-react'

export default function MetricCard({ icon: Icon, label, value, hint, tone = 'normal' }: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'normal' | 'red' | 'amber' | 'green'
}) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-card__icon"><Icon size={19} /></div>
      <div className="metric-card__body">
        <div className="metric-card__label">{label}</div>
        <div className="metric-card__value">{value}</div>
        {hint && <div className="metric-card__hint">{hint}</div>}
      </div>
    </div>
  )
}
