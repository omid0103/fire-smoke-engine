export default function EngineeringLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup" aria-label="Rabin Azar Fire Engineering">
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" role="img">
          <path d="M32 5c7 11 19 18 19 32 0 12-8 21-19 22-11-1-19-10-19-22 0-9 5-16 12-22 1 8 4 12 8 15-1-9 1-16 8-25 0 8 5 14 7 20-3-6-8-11-16-20z" fill="currentColor" opacity=".95"/>
          <path d="M22 40h20M26 33h12M29 47h6" stroke="#111417" strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
      </div>
      {!compact && (
        <div>
          <strong>رابین آذر</strong>
          <span>Fire Engineering Suite</span>
        </div>
      )}
    </div>
  )
}
