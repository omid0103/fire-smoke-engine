export const faNum = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '—'
  return String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

export const formatNumber = (value: unknown, digits = 2) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? '—')
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits }).format(n)
}

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}
