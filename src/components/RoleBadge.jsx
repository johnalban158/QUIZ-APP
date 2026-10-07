import { roleLabel } from '../lib'

const ROLE_CLASS = {
  NURSE: 'badge-role-nurse',
  CAREGIVER: 'badge-role-caregiver',
}

/**
 * Tiny role badge for NURSE vs CAREGIVER.
 *
 * Render-only: callers pass a role they already fetched (auth session,
 * `/staff/me`, or an admin roster row). Renders nothing when the role is
 * missing or unrecognized — never crashes, never placeholder text.
 */
export default function RoleBadge({ role }) {
  const key = String(role || '').toUpperCase()
  const className = ROLE_CLASS[key]
  if (!className) return null
  const label = roleLabel(key)
  return (
    <span className={`badge ${className}`} title={label}>
      {label}
    </span>
  )
}
