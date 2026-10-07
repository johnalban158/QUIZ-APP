/**
 * QuizFloaties — floating abstract shapes for the quiz intro screen.
 * An open-book form, rings, sparks and dots in mint/sky/teal/orange.
 * Decorative only.
 */
export default function QuizFloaties({ className = '' }) {
  return (
    <svg
      className={`quiz-floaties ${className}`.trim()}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="qf-mint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8e0cf" />
          <stop offset="100%" stopColor="#e2f5ec" />
        </linearGradient>
        <linearGradient id="qf-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9fd6e9" />
          <stop offset="100%" stopColor="#e6f4fa" />
        </linearGradient>
      </defs>

      {/* Open-book form — top left */}
      <g className="blob-drift" opacity="0.65" transform="translate(60 40)">
        <path fill="url(#qf-mint)" d="M 0 70 C 35 40 85 40 120 70 L 120 190 C 85 160 35 160 0 190 Z" />
        <path fill="#bfe9dd" d="M 60 70 C 95 45 145 48 180 78 L 180 196 C 145 166 95 168 60 190 Z" opacity="0.7" />
        <path
          fill="url(#qf-sky)"
          d="M 54 84 C 78 68 104 68 128 84 L 128 176 C 104 160 78 160 54 176 Z"
          opacity="0.9"
        />
      </g>

      {/* Sparkle — teal */}
      <g className="blob-drift-slow" opacity="0.8" transform="translate(980 130)">
        <path
          fill="#2c9c8c"
          d="M 40 0 C 42 22 46 28 70 34 C 46 40 42 46 40 68 C 38 46 34 40 10 34 C 34 28 38 22 40 0 Z"
          opacity="0.5"
        />
        <circle cx="20" cy="10" r="5" fill="#e8792f" opacity="0.55" />
      </g>

      {/* Ring + dot — sky, bottom left */}
      <g className="blob-drift" opacity="0.7" transform="translate(60 620)">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#8fcfe2" strokeWidth="10" />
        <circle cx="86" cy="92" r="14" fill="#2c9c8c" opacity="0.35" />
      </g>

      {/* Small floaties — top right / mid edge */}
      <g className="blob-drift-slow" opacity="0.8" transform="translate(1080 520)">
        <circle cx="20" cy="16" r="22" fill="url(#qf-mint)" />
        <path
          fill="#e8792f"
          d="M 78 0 C 79.5 11 84 15.5 95 17 C 84 18.5 79.5 23 78 34 C 76.5 23 72 18.5 61 17 C 72 15.5 76.5 11 78 0 Z"
          opacity="0.5"
        />
      </g>

      <g opacity="0.7" transform="translate(930 700)">
        <path
          fill="url(#qf-sky)"
          d="M 0 60 C 18 48 34 48 44 66 C 54 84 48 104 28 118 C 32 96 28 80 14 72 C 6 66 2 64 0 60 Z"
        />
      </g>
    </svg>
  )
}