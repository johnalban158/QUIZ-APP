/**
 * BlobField — full-page organic blob scene for the role-select screen.
 * Soft mint/sky gradients with a teal accent. Decorative only.
 */
export default function BlobField({ className = '' }) {
  return (
    <svg
      className={`blob-field ${className}`.trim()}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bf-mint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8e0cf" />
          <stop offset="100%" stopColor="#dff4ec" />
        </linearGradient>
        <linearGradient id="bf-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a9dcec" />
          <stop offset="100%" stopColor="#e8f5fb" />
        </linearGradient>
        <linearGradient id="bf-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2c9c8c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7cc7bb" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <g className="blob-drift-slow" opacity="0.6">
        <path
          fill="url(#bf-mint)"
          d="M -40 240 C -80 90 60 -30 220 -10 C 380 10 520 60 560 190 C 600 320 510 430 360 420 C 210 410 20 400 -40 240 Z"
        />
        <circle cx="90" cy="520" r="46" fill="url(#bf-mint)" opacity="0.75" />
      </g>

      <g className="blob-drift" opacity="0.55">
        <path
          fill="url(#bf-sky)"
          d="M 760 860 C 620 800 620 630 720 540 C 820 450 1020 420 1140 500 C 1260 580 1300 720 1200 800 C 1100 880 900 920 760 860 Z"
        />
        <circle cx="330" cy="660" r="90" fill="url(#bf-sky)" opacity="0.5" />
      </g>

      <g className="blob-drift" opacity="0.7">
        <path
          fill="url(#bf-teal)"
          d="M 920 150 C 880 90 960 30 1040 50 C 1120 70 1185 130 1165 200 C 1145 270 1055 300 985 270 C 925 245 960 210 920 150 Z"
        />
      </g>

      <g opacity="0.8">
        <circle cx="1100" cy="640" r="60" fill="none" stroke="#8fcfe2" strokeWidth="10" opacity="0.5" />
        <circle cx="800" cy="180" r="16" fill="#2c9c8c" opacity="0.3" />
        <circle cx="480" cy="90" r="12" fill="#a8e0cf" opacity="0.85" />
        <circle cx="180" cy="140" r="26" fill="none" stroke="#a9dcec" strokeWidth="8" />
        <circle cx="1010" cy="360" r="10" fill="#e8792f" opacity="0.28" />
      </g>
    </svg>
  )
}