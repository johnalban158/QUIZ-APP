export const SPECIALTIES = [
  { value: 'HOME_HEALTH_AIDE', label: 'Home Health Aide' },
  { value: 'PERSONAL_CARE_AIDE', label: 'Personal Care Aide' },
  { value: 'COMPANION_RESPITE_AIDE', label: 'Companion & Respite Aide' },
]

export function specialtyLabel(value) {
  const found = SPECIALTIES.find((s) => s.value === value)
  return found ? found.label : value
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}