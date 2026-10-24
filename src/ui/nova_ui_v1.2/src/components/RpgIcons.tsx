import React from 'react';

export const PotionIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="potShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#5a4630" stopOpacity="0.48" />
        <stop offset="70%" stopColor="#5a4630" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#5a4630" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="potLiquid" cx="38%" cy="68%" r="55%">
        <stop offset="0%" stopColor="#ff6a4d" />
        <stop offset="35%" stopColor="#e81e25" />
        <stop offset="75%" stopColor="#9e0b12" />
        <stop offset="100%" stopColor="#590408" />
      </radialGradient>
      <linearGradient id="potMeniscus" x1="0%" y1="0%" x2="100%" y2="20%">
        <stop offset="0%" stopColor="#ff7b6b" />
        <stop offset="50%" stopColor="#e3242b" />
        <stop offset="100%" stopColor="#9e0e14" />
      </linearGradient>
      <linearGradient id="potCork" x1="0%" y1="0%" x2="100%" y2="25%">
        <stop offset="0%" stopColor="#c78c52" />
        <stop offset="55%" stopColor="#8f5729" />
        <stop offset="100%" stopColor="#563012" />
      </linearGradient>
      <linearGradient id="potGlass" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
        <stop offset="45%" stopColor="#e8dfd0" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#8c7d68" stopOpacity="0.45" />
      </linearGradient>
    </defs>

    {/* Cast drop shadow */}
    <ellipse cx="42" cy="84" rx="28" ry="9" fill="url(#potShadow)" transform="rotate(-8 42 84)" />

    <g transform="rotate(17 52 54)">
      {/* Cork stopper */}
      <path
        d="M44 10 C44 8.5, 56 8.5, 56 10 L54.5 21 C54.5 22, 45.5 22, 45.5 21 Z"
        fill="url(#potCork)"
        stroke="#3e220c"
        strokeWidth="1.5"
      />
      <ellipse cx="50" cy="10" rx="6" ry="2" fill="#d9a36c" stroke="#4a2810" strokeWidth="1" />

      {/* Bottle Glass Body Outer */}
      <path
        d="M42 20 C42 18.5, 58 18.5, 58 20 C58 21.5, 56.5 22.5, 55.5 23.5 L55.5 34 C69 38, 78 50, 77 65 C76 80, 64 89, 50 89 C36 89, 24 80, 23 65 C22 50, 31 38, 44.5 34 L44.5 23.5 C43.5 22.5, 42 21.5, 42 20 Z"
        fill="url(#potGlass)"
        stroke="#574838"
        strokeWidth="2"
      />

      {/* Red Liquid Fill */}
      <path
        d="M25.8 57 C24.5 72, 34.5 86, 50 86 C65.5 86, 75.5 72, 74.2 57 C73.5 52, 70 47.5, 66 45.5 L34 45.5 C30 47.5, 26.5 52, 25.8 57 Z"
        fill="url(#potLiquid)"
      />

      {/* Liquid Top Meniscus Ellipse */}
      <ellipse cx="50" cy="46" rx="16.5" ry="5" fill="url(#potMeniscus)" stroke="#ff988a" strokeWidth="0.7" />

      {/* Inner bottom glow */}
      <path
        d="M32 74 C37 82, 49 84, 60 80"
        stroke="#ff8a75"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Left Glass Curved Specular Highlight */}
      <path
        d="M35 44 C28 51, 27 64, 32 74"
        stroke="#ffffff"
        strokeWidth="4.2"
        strokeLinecap="round"
        opacity="0.82"
      />
      <path
        d="M46.5 24 L46.5 34"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Right Glass Rim Edge Highlight */}
      <path
        d="M67 49 C72 56, 72 68, 66 77"
        stroke="#f7efe2"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Bottle Lip Ring */}
      <path
        d="M41.5 20.5 C41.5 22.5, 58.5 22.5, 58.5 20.5"
        stroke="#63513d"
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M43 19.5 C46 20.8, 54 20.8, 57 19.5"
        stroke="#ffffff"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.8"
      />
    </g>
  </svg>
);

export const HerbIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="leafLight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#99c64d" />
        <stop offset="55%" stopColor="#5e8d26" />
        <stop offset="100%" stopColor="#355812" />
      </linearGradient>
      <linearGradient id="leafDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6fa132" />
        <stop offset="60%" stopColor="#416b18" />
        <stop offset="100%" stopColor="#25420b" />
      </linearGradient>
      <filter id="herbShadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="1" dy="4" stdDeviation="2.5" floodColor="#3d2e1b" floodOpacity="0.4" />
      </filter>
    </defs>

    <g filter="url(#herbShadow)">
      {/* Main Stem */}
      <path
        d="M18 83 C30 72, 48 53, 76 22"
        stroke="#4a5723"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M18 83 C26 75, 38 64, 54 46"
        stroke="#788844"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Tiny basal stipules at bottom left */}
      <path d="M23 78 C17 75, 15 70, 19 67 C23 69, 25 74, 23 78 Z" fill="url(#leafDark)" stroke="#243b0b" strokeWidth="1" />
      <path d="M25 79 C29 83, 35 83, 37 79 C34 76, 29 76, 25 79 Z" fill="url(#leafLight)" stroke="#243b0b" strokeWidth="1" />

      {/* Left Leaf 1 (Lower) */}
      <path
        d="M32 68 C24 58, 22 44, 29 33 C37 40, 40 53, 35 66 Z"
        fill="url(#leafLight)"
        stroke="#243d0c"
        strokeWidth="1.4"
      />
      <path d="M33 66 C31 54, 30 43, 29 34" stroke="#b6dc6f" strokeWidth="1.1" strokeLinecap="round" />

      {/* Right Leaf 1 (Lower) */}
      <path
        d="M36 66 C48 69, 63 65, 72 56 C63 49, 49 52, 38 63 Z"
        fill="url(#leafDark)"
        stroke="#243d0c"
        strokeWidth="1.4"
      />
      <path d="M38 64 C50 61, 61 59, 70 56" stroke="#9bc454" strokeWidth="1.1" strokeLinecap="round" />

      {/* Left Leaf 2 (Middle) */}
      <path
        d="M47 52 C40 41, 41 27, 49 17 C56 26, 56 39, 50 50 Z"
        fill="url(#leafLight)"
        stroke="#243d0c"
        strokeWidth="1.4"
      />
      <path d="M48 50 C48 39, 48 28, 49 19" stroke="#b6dc6f" strokeWidth="1.1" strokeLinecap="round" />

      {/* Right Leaf 2 (Middle) */}
      <path
        d="M51 50 C63 52, 76 48, 85 39 C76 33, 63 37, 53 47 Z"
        fill="url(#leafDark)"
        stroke="#243d0c"
        strokeWidth="1.4"
      />
      <path d="M53 48 C64 45, 74 42, 83 39" stroke="#9bc454" strokeWidth="1.1" strokeLinecap="round" />

      {/* Left Leaf 3 (Upper) */}
      <path
        d="M62 36 C58 27, 60 17, 66 10 C71 17, 70 27, 65 34 Z"
        fill="url(#leafLight)"
        stroke="#243d0c"
        strokeWidth="1.3"
      />
      <path d="M63 34 C64 26, 65 18, 66 12" stroke="#b6dc6f" strokeWidth="1" strokeLinecap="round" />

      {/* Right Leaf 3 (Upper) */}
      <path
        d="M65 34 C74 35, 83 32, 89 25 C82 21, 73 24, 66 32 Z"
        fill="url(#leafDark)"
        stroke="#243d0c"
        strokeWidth="1.3"
      />

      {/* Terminal Top-Right Leaf */}
      <path
        d="M69 29 C73 19, 81 12, 89 9 C88 18, 81 26, 71 30 Z"
        fill="url(#leafLight)"
        stroke="#243d0c"
        strokeWidth="1.4"
      />
      <path d="M70 29 C76 22, 82 15, 88 10" stroke="#c3e67e" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  </svg>
);

export const CrystalIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="crysLight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d4f7ff" />
        <stop offset="45%" stopColor="#63cdfc" />
        <stop offset="100%" stopColor="#1c7ed6" />
      </linearGradient>
      <linearGradient id="crysMid" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7ad9ff" />
        <stop offset="50%" stopColor="#228be6" />
        <stop offset="100%" stopColor="#0b4f9c" />
      </linearGradient>
      <linearGradient id="crysDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2b7de0" />
        <stop offset="60%" stopColor="#10468a" />
        <stop offset="100%" stopColor="#072554" />
      </linearGradient>
      <filter id="crysShadow" x="-15%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="1" dy="4" stdDeviation="2.5" floodColor="#23354d" floodOpacity="0.45" />
      </filter>
    </defs>

    <g filter="url(#crysShadow)">
      {/* Left Secondary Shard */}
      <polygon points="22,64 27,32 39,26 43,66 30,76" fill="url(#crysMid)" stroke="#092d5e" strokeWidth="1.3" />
      <polygon points="22,64 27,32 34,40 30,76" fill="url(#crysLight)" />
      <polygon points="27,32 39,26 34,40" fill="#e3faff" />

      {/* Back Right Tall Shard */}
      <polygon points="52,65 68,24 78,28 76,44 62,74" fill="url(#crysDark)" stroke="#082854" strokeWidth="1.3" />
      <polygon points="52,65 68,24 72,36 58,70" fill="url(#crysMid)" />
      <polygon points="68,24 78,28 72,36" fill="#99e5ff" />

      {/* Center Dominant Main Crystal Prism */}
      <polygon points="34,76 44,18 57,10 66,22 56,80 44,86" fill="url(#crysMid)" stroke="#072652" strokeWidth="1.5" />
      {/* Left sunlit facet of main crystal */}
      <polygon points="34,76 44,18 52,26 44,86" fill="url(#crysLight)" />
      {/* Right deep facet of main crystal */}
      <polygon points="52,26 66,22 56,80 44,86" fill="url(#crysDark)" />
      {/* Top crown facets of main crystal */}
      <polygon points="44,18 57,10 52,26" fill="#ebfcff" />
      <polygon points="57,10 66,22 52,26" fill="#7bd8ff" />

      {/* Lower Left Small Shard */}
      <polygon points="18,74 20,53 30,57 35,82 24,84" fill="url(#crysMid)" stroke="#082854" strokeWidth="1.2" />
      <polygon points="18,74 20,53 26,62 24,84" fill="url(#crysLight)" />
      <polygon points="26,62 30,57 35,82 24,84" fill="url(#crysDark)" />

      {/* Lower Right Small Shard */}
      <polygon points="52,82 67,50 78,52 76,68 62,86" fill="url(#crysMid)" stroke="#082854" strokeWidth="1.2" />
      <polygon points="52,82 67,50 71,60 57,84" fill="url(#crysLight)" />
      <polygon points="71,60 78,52 76,68 62,86 57,84" fill="url(#crysDark)" />

      {/* Bottom Center Cluster Shard */}
      <polygon points="35,84 44,58 54,64 52,87 42,89" fill="url(#crysMid)" stroke="#072554" strokeWidth="1.2" />
      <polygon points="35,84 44,58 47,68 42,89" fill="#a5ebff" />

      {/* Specular White Facet Highlights */}
      <polyline points="44,18 52,26 44,85" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
      <polyline points="27,32 34,40 30,74" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      <line x1="57" y1="10" x2="52" y2="26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  </svg>
);

export const ScrollIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="parchBody" x1="20%" y1="15%" x2="80%" y2="85%">
        <stop offset="0%" stopColor="#fae3b4" />
        <stop offset="45%" stopColor="#dfb474" />
        <stop offset="80%" stopColor="#b37f40" />
        <stop offset="100%" stopColor="#805321" />
      </linearGradient>
      <linearGradient id="parchRollTop" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff0cf" />
        <stop offset="55%" stopColor="#d4a463" />
        <stop offset="100%" stopColor="#8a5a26" />
      </linearGradient>
      <filter id="scrollShadow" x="-15%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="1" dy="4" stdDeviation="2.5" floodColor="#3b2813" floodOpacity="0.45" />
      </filter>
    </defs>

    <g filter="url(#scrollShadow)">
      {/* Top-Right Rolled End */}
      <path
        d="M56 22 C60 15, 70 14, 78 20 C85 26, 85 36, 78 41 L62 56 L44 38 Z"
        fill="url(#parchRollTop)"
        stroke="#4f3014"
        strokeWidth="1.5"
      />
      {/* Top-Right Spiral Curl */}
      <ellipse cx="73" cy="27" rx="9" ry="5.5" transform="rotate(38 73 27)" fill="#8c5b27" stroke="#4a2c11" strokeWidth="1.4" />
      <path d="M68 24 C72 22, 77 25, 77 29 C76 32, 72 32, 70 29" stroke="#f7dfb0" strokeWidth="1.5" strokeLinecap="round" />

      {/* Main Diagonal Scroll Cylinder */}
      <path
        d="M21 61 L56 24 C63 26, 71 33, 74 41 L39 79 C32 78, 24 70, 21 61 Z"
        fill="url(#parchBody)"
        stroke="#4f3014"
        strokeWidth="1.5"
      />

      {/* Overlapping Parchment Seam Line & Aged Notch */}
      <path d="M35 75 L70 38" stroke="#75491d" strokeWidth="1.2" opacity="0.7" />
      <path d="M32 49 L36 48 L35 44" fill="#b37f40" stroke="#4f3014" strokeWidth="1" />

      {/* Center Leather Tie / Band */}
      <path
        d="M39 41 C47 42, 55 49, 57 58 L52 63 C49 54, 42 47, 34 46 Z"
        fill="#4a2a14"
        stroke="#261306"
        strokeWidth="1.4"
      />
      <path
        d="M42 43 C48 45, 53 50, 55 56"
        stroke="#8c5832"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Bottom-Left Rolled End with Spiral Opening */}
      <ellipse
        cx="29"
        cy="71"
        rx="12"
        ry="7.5"
        transform="rotate(40 29 71)"
        fill="#c99552"
        stroke="#4a2c11"
        strokeWidth="1.6"
      />
      <ellipse
        cx="29"
        cy="71"
        rx="7.5"
        ry="4.5"
        transform="rotate(40 29 71)"
        fill="#3b200c"
        stroke="#f5daab"
        strokeWidth="1.3"
      />
      <path
        d="M25 68 C28 66, 33 69, 32 73 C31 75, 28 74, 27 72"
        stroke="#d9a866"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Specular Parchment Highlight */}
      <path d="M27 59 L57 28" stroke="#fff4d9" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
    </g>
  </svg>
);

export const SwordIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bladeLight" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9aa4ae" />
        <stop offset="50%" stopColor="#dce3ea" />
        <stop offset="85%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#b8c2cc" />
      </linearGradient>
      <linearGradient id="bladeDark" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3c4248" />
        <stop offset="50%" stopColor="#5d666f" />
        <stop offset="100%" stopColor="#454c54" />
      </linearGradient>
      <linearGradient id="guardSteel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#b0b7bf" />
        <stop offset="50%" stopColor="#5c646c" />
        <stop offset="100%" stopColor="#2f3438" />
      </linearGradient>
      <filter id="swordShadow" x="-15%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="1" dy="4" stdDeviation="2.2" floodColor="#2b2318" floodOpacity="0.45" />
      </filter>
    </defs>

    <g filter="url(#swordShadow)">
      {/* Upper-Left Sunlit Blade Bevel */}
      <polygon
        points="35,55 74,16 86,14 42,62"
        fill="url(#bladeLight)"
        stroke="#2b3036"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Lower-Right Shadowed Blade Bevel (with battle nick) */}
      <polygon
        points="42,62 86,14 84,26 67,43 64,42 65,45 45,65"
        fill="url(#bladeDark)"
        stroke="#2b3036"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Central Blade Ridge Line */}
      <line x1="40" y1="60" x2="85.5" y2="14.5" stroke="#ffffff" strokeWidth="1.3" opacity="0.85" />

      {/* Crossguard (Quillons) */}
      <path
        d="M25 49 L30 44 L40 54 L54 68 L49 73 L36 60 Z"
        fill="url(#guardSteel)"
        stroke="#23272b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Guard Center Collar / Langet */}
      <polygon points="34,54 44,48 46,54 40,64" fill="#77808a" stroke="#23272b" strokeWidth="1.2" />

      {/* Leather Wrapped Grip */}
      <path
        d="M19 73 L32 58 L40 66 L25 79 Z"
        fill="#5e3219"
        stroke="#291306"
        strokeWidth="1.4"
      />
      {/* Grip Rib Lines */}
      <line x1="23" y1="69" x2="29" y2="75" stroke="#291306" strokeWidth="1.3" />
      <line x1="27" y1="65" x2="33" y2="71" stroke="#291306" strokeWidth="1.3" />
      <line x1="30" y1="61" x2="36" y2="67" stroke="#291306" strokeWidth="1.3" />

      {/* Round Iron Pommel */}
      <circle cx="19" cy="79" r="6.5" fill="url(#guardSteel)" stroke="#23272b" strokeWidth="1.5" />
      <circle cx="18.5" cy="78.5" r="3" fill="#9ba3ab" stroke="#3a4046" strokeWidth="1" />
    </g>
  </svg>
);

export const ShieldIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="shieldWood" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#b87b42" />
        <stop offset="55%" stopColor="#855023" />
        <stop offset="100%" stopColor="#4a280d" />
      </radialGradient>
      <linearGradient id="shieldRim" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#c4ccd4" />
        <stop offset="45%" stopColor="#69717a" />
        <stop offset="100%" stopColor="#282c30" />
      </linearGradient>
      <radialGradient id="shieldBoss" cx="38%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#e8eef2" />
        <stop offset="45%" stopColor="#7c858e" />
        <stop offset="100%" stopColor="#2d3238" />
      </radialGradient>
      <filter id="shieldShadow" x="-15%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="2" dy="4" stdDeviation="2.5" floodColor="#261d11" floodOpacity="0.5" />
      </filter>
    </defs>

    <g filter="url(#shieldShadow)">
      {/* Back Rim Depth (3D Thickness on Right) */}
      <ellipse cx="52" cy="51" rx="34" ry="36" transform="rotate(8 52 51)" fill="#23272b" />

      {/* Main Steel Rim */}
      <ellipse
        cx="49"
        cy="50"
        rx="34"
        ry="36"
        transform="rotate(8 49 50)"
        fill="url(#shieldRim)"
        stroke="#1e2226"
        strokeWidth="1.6"
      />

      {/* Inner Wooden Field */}
      <ellipse
        cx="48.5"
        cy="50"
        rx="27.5"
        ry="29.5"
        transform="rotate(8 48.5 50)"
        fill="url(#shieldWood)"
        stroke="#2b190a"
        strokeWidth="1.6"
      />

      {/* Radial Iron Straps / Wood Segment Dividers */}
      <g stroke="#322316" strokeWidth="2.4" opacity="0.85">
        <line x1="48.5" y1="20.5" x2="48.5" y2="79.5" />
        <line x1="21" y1="50" x2="76" y2="50" />
        <line x1="29" y1="29" x2="68" y2="71" />
        <line x1="68" y1="29" x2="29" y2="71" />
      </g>

      {/* Center Steel Boss (Umbo) */}
      <ellipse
        cx="48.5"
        cy="50"
        rx="11"
        ry="12"
        transform="rotate(8 48.5 50)"
        fill="url(#shieldBoss)"
        stroke="#1e2226"
        strokeWidth="1.5"
      />

      {/* Rim Rivets */}
      {[
        [49, 17],
        [69, 25],
        [79, 44],
        [73, 66],
        [55, 82],
        [33, 79],
        [19, 62],
        [18, 39],
        [30, 22],
      ].map(([cx, cy], idx) => (
        <circle key={idx} cx={cx} cy={cy} r="1.7" fill="#d8e0e8" stroke="#23272b" strokeWidth="0.8" />
      ))}
    </g>
  </svg>
);

/* 5 Equipment Silhouettes for Right Column */
export const EquipSwordSilhouette: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M52 12 L49 23 L27 45 L21 39 L43 17 L52 12 Z M15 35 L31 51 L28 54 L12 38 L15 35 Z M19 45 L24 50 L16 58 C14 59, 11 59, 10 57 C9 55, 9 52, 11 51 L19 45 Z"
      fill="#857c6a"
    />
  </svg>
);

export const EquipHelmetSilhouette: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M32 10 C19 10, 14 20, 14 33 L14 48 C14 51, 18 54, 24 55 L26 42 L20 39 L20 34 L29 36 L30 46 L32 48 L34 46 L35 36 L44 34 L44 39 L38 42 L40 55 C46 54, 50 51, 50 48 L50 33 C50 20, 45 10, 32 10 Z"
      fill="#857c6a"
    />
  </svg>
);

export const EquipArmorSilhouette: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22 14 C14 15, 9 20, 8 27 L15 31 L18 26 L20 42 L32 47 L44 42 L46 26 L49 31 L56 27 C55 20, 50 15, 42 14 C39 18, 36 20, 32 20 C28 20, 25 18, 22 14 Z M19 45 L16 53 L27 55 L29 48 L19 45 Z M45 45 L35 48 L37 55 L48 53 L45 45 Z"
      fill="#857c6a"
    />
  </svg>
);

export const EquipRingSilhouette: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M32 10 L40 18 L35 23 L29 23 L24 18 L32 10 Z"
      fill="#857c6a"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M32 22 C22 22, 15 29.5, 15 39 C15 48.5, 22 55, 32 55 C42 55, 49 48.5, 49 39 C49 29.5, 42 22, 32 22 Z M32 29 C26.5 29, 22 33.5, 22 39 C22 44.5, 26.5 48.5, 32 48.5 C37.5 48.5, 42 44.5, 42 39 C42 33.5, 37.5 29, 32 29 Z"
      fill="#857c6a"
    />
  </svg>
);

export const EquipBootsSilhouette: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back/Left Boot */}
    <path
      d="M24 14 L35 14 L34 39 L34 46 L14 46 C12 46, 11 43, 13 41 L22 37 L24 14 Z"
      fill="#99907e"
    />
    {/* Front/Right Boot */}
    <path
      d="M33 17 L46 17 L44 43 L45 52 L21 52 C18 52, 17 48, 20 46 L31 41 L33 17 Z"
      fill="#7c7362"
    />
  </svg>
);

/* Currency Icons: Gold Star Coin & Purple Faceted Gem */
export const GoldCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="coinRim" x1="15%" y1="10%" x2="85%" y2="90%">
        <stop offset="0%" stopColor="#fff3b8" />
        <stop offset="40%" stopColor="#e6b84c" />
        <stop offset="80%" stopColor="#9e6d16" />
        <stop offset="100%" stopColor="#d6a438" />
      </linearGradient>
      <radialGradient id="coinWell" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#f5cb62" />
        <stop offset="65%" stopColor="#b88422" />
        <stop offset="100%" stopColor="#7d530b" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="25.5" r="19" fill="#5e400b" opacity="0.45" />
    <circle cx="24" cy="24" r="19" fill="url(#coinRim)" stroke="#7a520d" strokeWidth="1.2" />
    <circle cx="24" cy="24" r="14.5" fill="url(#coinWell)" stroke="#ffea9f" strokeWidth="0.9" />
    <polygon
      points="24,13 26.9,19.4 33.8,20.2 28.6,24.9 30.1,31.7 24,28.2 17.9,31.7 19.4,24.9 14.2,20.2 21.1,19.4"
      fill="#ffe88a"
      stroke="#8c5c0e"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

export const PurpleGemIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-8' }) => (
  <svg viewBox="0 0 44 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="22,4 38,24 22,44 6,24" fill="#7e22ce" stroke="#3b0764" strokeWidth="1.4" />
    <polygon points="22,4 29,24 22,44 15,24" fill="#a855f7" />
    <polygon points="22,4 15,24 6,24" fill="#d8b4fe" />
    <polygon points="22,4 38,24 29,24" fill="#9333ea" />
    <polygon points="6,24 15,24 22,44" fill="#6b21a8" />
    <polygon points="29,24 38,24 22,44" fill="#4c1d95" />
    <polygon points="22,12 27,24 22,36 17,24" fill="#c084fc" opacity="0.7" />
    <polyline points="15,24 22,4 29,24" stroke="#f3e8ff" strokeWidth="1" opacity="0.85" />
  </svg>
);

/* Status Bar Icons: Heart & Mana Orb */
export const HeartStatusIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="heartFill" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#ff857a" />
        <stop offset="38%" stopColor="#e61c24" />
        <stop offset="85%" stopColor="#8c070c" />
        <stop offset="100%" stopColor="#520205" />
      </radialGradient>
    </defs>
    <path
      d="M20 35 C20 35, 5 25.5, 5 14 C5 8.5, 9.5 4.5, 14.5 4.5 C17.5 4.5, 19.2 6.2, 20 7.8 C20.8 6.2, 22.5 4.5, 25.5 4.5 C30.5 4.5, 35 8.5, 35 14 C35 25.5, 20 35, 20 35 Z"
      fill="url(#heartFill)"
      stroke="#d4af59"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M10 13 C10 10, 12.5 8, 15 8"
      stroke="#ffd4cf"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.85"
    />
  </svg>
);

export const ManaStatusIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="manaOrb" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#7ce0ff" />
        <stop offset="45%" stopColor="#0e87d4" />
        <stop offset="85%" stopColor="#064785" />
        <stop offset="100%" stopColor="#03264d" />
      </radialGradient>
    </defs>
    <circle cx="20" cy="20" r="15" fill="url(#manaOrb)" stroke="#9ecae6" strokeWidth="2" />
    {/* Inner white magic swirl */}
    <path
      d="M20 12 C15 12, 12 16, 12 20.5 C12 25.5, 16.5 29, 21.5 28.5 C25.5 28, 28 24.5, 27.5 20.5 C27 17.5, 24 15.5, 21 16 C18.5 16.5, 17 18.8, 17.8 21 C18.5 22.8, 20.8 23.2, 22 22"
      stroke="#ffffff"
      strokeWidth="2.3"
      strokeLinecap="round"
      fill="none"
      opacity="0.92"
    />
  </svg>
);
