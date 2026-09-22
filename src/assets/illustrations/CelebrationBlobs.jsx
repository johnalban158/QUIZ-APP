/**
 * CelebrationBlobs — abstract celebration burst for the result screen.
 * Sun-ray ring, concentric circles and confetti dots in teal/mint/orange.
 * Decorative only.
 */
export default function CelebrationBlobs({ className = '' }) {
  return (
    <svg
      className={`celebration-blobs ${className}`.trim()}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cb-mint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8e0cf" />
          <stop offset="100%" stopColor="#e6f6ef" />
        </linearGradient>
        <linearGradient id="cb-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a9dcec" />
          <stop offset="100%" stopColor="#eaf6fb" />
        </linearGradient>
      </defs>

      {/* Soft halo behind the result card */}
      <g className="blob-drift-slow" opacity="0.55">
        <circle cx="600" cy="380" r="240" fill="url(#cb-mint)" />
        <circle cx="600" cy="380" r="168" fill="url(#cb-sky)" opacity="0.8" />
      </g>

      {/* Sun-ray ring */}
      <g className="blob-drift-slow" opacity="0.5">
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(30 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(60 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(90 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(120 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(150 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(180 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(210 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(240 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(270 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(300 600 380)" />
        <path d="M600 380 L586 150 L614 150 Z" fill="#2c9c8c" transform="rotate(330 600 380)" />
      </g>

      {/* Concentric accent rings */}
      <g className="blob-drift" opacity="0.7">
        <circle cx="600" cy="380" r="120" fill="none" stroke="#2c9c8c" strokeWidth="6" opacity="0.35" />
        <circle cx="600" cy="380" r="78" fill="none" stroke="#e8792f" strokeWidth="5" opacity="0.28" />
      </g>

      {/* Confetti dots */}
      <g className="blob-drift" opacity="0.75">
        <circle cx="170" cy="250" r="9" fill="#2c9c8c" opacity="0.5" />
        <circle cx="220" cy="150" r="6" fill="#e8792f" opacity="0.55" />
        <circle cx="1030" cy="220" r="10" fill="#e8792f" opacity="0.45" />
        <circle cx="1100" cy="320" r="6" fill="#2c9c8c" opacity="0.5" />
        <circle cx="150" cy="600" r="8" fill="#2c9c8c" opacity="0.4" />
        <circle cx="1040" cy="620" r="9" fill="#2c9c8c" opacity="0.45" />
        <circle cx="300" cy="700" r="12" fill="url(#cb-sky)" />
        <circle cx="920" cy="130" r="10" fill="url(#cb-mint)" />
        <circle cx="1120" cy="560" r="14" fill="url(#cb-mint)" />
      </g>
    </svg>
  )
}