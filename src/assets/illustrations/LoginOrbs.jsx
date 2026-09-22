/**
 * LoginOrbs — calm floating orbs for the staff/admin login screens.
 * Keeps the center clear so the login card stands alone.
 * Decorative only.
 */
export default function LoginOrbs({ className = '' }) {
  return (
    <svg
      className={`login-orbs ${className}`.trim()}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lo-mint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8e0cf" />
          <stop offset="100%" stopColor="#e2f5ec" />
        </linearGradient>
        <linearGradient id="lo-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a9dcec" />
          <stop offset="100%" stopColor="#eaf6fb" />
        </linearGradient>
      </defs>

      <g className="blob-drift-slow" opacity="0.6">
        <path
          fill="url(#lo-mint)"
          d="M -60 260 C -100 110 40 -20 200 0 C 360 20 490 70 530 200 C 570 330 480 440 330 430 C 180 420 0 400 -60 260 Z"
        />
      </g>

      <g className="blob-drift" opacity="0.55">
        <path
          fill="url(#lo-sky)"
          d="M 780 840 C 640 780 640 610 740 520 C 840 430 1040 400 1160 480 C 1280 560 1320 700 1220 780 C 1120 860 920 900 780 840 Z"
        />
      </g>

      <g className="blob-drift" opacity="0.7">
        <circle cx="1030" cy="170" r="90" fill="none" stroke="#8fcfe2" strokeWidth="12" />
        <circle cx="150" cy="620" r="42" fill="url(#lo-sky)" />
      </g>

      <g opacity="0.8">
        <circle cx="940" cy="620" r="14" fill="#2c9c8c" opacity="0.35" />
        <circle cx="220" cy="130" r="10" fill="#e8792f" opacity="0.4" />
        <circle cx="1100" cy="380" r="8" fill="#2c9c8c" opacity="0.3" />
      </g>
    </svg>
  )
}