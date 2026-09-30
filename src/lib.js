// Roles are ADMIN / NURSE / CAREGIVER — STAFF and TAKER were removed.
export const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'CAREGIVER', label: 'Caregiver' },
]

// The two roles that may use the staff portal (/staff/*).
export const STAFF_ROLES = ['NURSE', 'CAREGIVER']

export function isStaffRole(role) {
  return role === 'NURSE' || role === 'CAREGIVER'
}

export function roleLabel(value) {
  if (!value) return ''
  const found = ROLES.find((r) => r.value === value)
  return found ? found.label : String(value).toLowerCase()
}

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