export default function StatusPill({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'danger' | 'neutral' | 'info'; children: React.ReactNode }) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}
