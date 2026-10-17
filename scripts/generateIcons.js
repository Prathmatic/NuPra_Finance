import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG for adaptive foreground (108x108 viewport, with guaranteed 66dp safe zone centered card)
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="1080" height="1080" fill="none">
  <defs>
    <!-- Border Gradient matching NPIcon -->
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    
    <!-- N Letter Gradient: Pure white to crisp slate -->
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>

    <!-- P Letter Gradient: Emerald-300 to Teal to Indigo-300 -->
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="50%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#a5b4fc"/>
    </linearGradient>

    <!-- Ambient Glow Filter -->
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Ambient Glow Behind Card (Centered at 54, 54, size 48x48) -->
  <rect x="30" y="30" width="48" height="48" rx="14" fill="url(#cardBorder)" opacity="0.35" filter="url(#glow)"/>

  <!-- Card Border -->
  <rect x="30" y="30" width="48" height="48" rx="13" fill="#020617"/>
  <rect x="30" y="30" width="48" height="48" rx="13" stroke="url(#cardBorder)" stroke-width="2.2" stroke-opacity="0.95"/>

  <!-- Inner Dark Slate Panel -->
  <rect x="32" y="32" width="44" height="44" rx="11" fill="#090d16" fill-opacity="0.96"/>

  <!-- Subtle Sheen diagonal -->
  <path d="M32.5 32.5 L58 32.5 L32.5 58 Z" fill="#ffffff" opacity="0.08"/>

  <!-- NP Monogram - Perfectly Centered -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="24" letter-spacing="-1.5">
    <text x="44.5" y="62.5" fill="url(#nGrad)" text-anchor="middle">N</text>
    <text x="61.5" y="62.5" fill="url(#pGrad)" text-anchor="middle">P</text>
  </g>

  <!-- Micro Jewel Indicator (bottom right of card) -->
  <circle cx="69" cy="68.5" r="1.8" fill="#10b981"/>
  <circle cx="69" cy="68.5" r="0.9" fill="#a7f3d0"/>
</svg>
`;

// SVG for standalone full icon (Legacy launcher & PWA)
const fullIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1000" height="1000" fill="none">
  <defs>
    <linearGradient id="fullBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13"/>
      <stop offset="50%" stop-color="#0b0f19"/>
      <stop offset="100%" stop-color="#0d1124"/>
    </linearGradient>
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="50%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#a5b4fc"/>
    </linearGradient>
  </defs>

  <!-- Full Background with rounded corner frame -->
  <rect width="100" height="100" rx="22" fill="url(#fullBg)"/>

  <!-- Centered Card with safe padding (size 64x64, rx=17) -->
  <rect x="18" y="18" width="64" height="64" rx="17" fill="#020617"/>
  <rect x="18" y="18" width="64" height="64" rx="17" stroke="url(#cardBorder)" stroke-width="2.6" stroke-opacity="0.95"/>

  <!-- Inner Panel -->
  <rect x="20.5" y="20.5" width="59" height="59" rx="15" fill="#090d16" fill-opacity="0.96"/>

  <!-- Subtle Sheen diagonal -->
  <path d="M21 21 L54 21 L21 54 Z" fill="#ffffff" opacity="0.08"/>

  <!-- NP Monogram -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="31" letter-spacing="-1.8">
    <text x="38" y="61.5" fill="url(#nGrad)" text-anchor="middle">N</text>
    <text x="59.5" y="61.5" fill="url(#pGrad)" text-anchor="middle">P</text>
  </g>

  <!-- Micro Jewel Indicator -->
  <circle cx="70" cy="70" r="2.4" fill="#10b981"/>
  <circle cx="70" cy="70" r="1.2" fill="#a7f3d0"/>
</svg>
`;

// SVG for round icon
const roundIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1000" height="1000" fill="none">
  <defs>
    <linearGradient id="roundBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13"/>
      <stop offset="50%" stop-color="#0b0f19"/>
      <stop offset="100%" stop-color="#0d1124"/>
    </linearGradient>
    <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="nGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="pGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="50%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#a5b4fc"/>
    </linearGradient>
  </defs>

  <!-- Circular background -->
  <circle cx="50" cy="50" r="50" fill="url(#roundBg)"/>
  <circle cx="50" cy="50" r="48" stroke="url(#cardBorder)" stroke-width="2" stroke-opacity="0.6"/>

  <!-- Centered Card completely safe within circle (size 54x54, rx=15) -->
  <rect x="23" y="23" width="54" height="54" rx="15" fill="#020617"/>
  <rect x="23" y="23" width="54" height="54" rx="15" stroke="url(#cardBorder)" stroke-width="2.4" stroke-opacity="0.95"/>

  <!-- Inner Panel -->
  <rect x="25.5" y="25.5" width="49" height="49" rx="13" fill="#090d16" fill-opacity="0.96"/>

  <!-- Subtle Sheen diagonal -->
  <path d="M26 26 L52 26 L26 52 Z" fill="#ffffff" opacity="0.08"/>

  <!-- NP Monogram -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="26" letter-spacing="-1.5">
    <text x="39" y="60" fill="url(#nGrad)" text-anchor="middle">N</text>
    <text x="58.5" y="60" fill="url(#pGrad)" text-anchor="middle">P</text>
  </g>

  <!-- Micro Jewel Indicator -->
  <circle cx="67.5" cy="67.5" r="2" fill="#10b981"/>
  <circle cx="67.5" cy="67.5" r="1" fill="#a7f3d0"/>
</svg>
`;

async function generateIcons() {
  const resDir = path.resolve('android/app/src/main/res');

  const mipmapSizes = [
    { folder: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { folder: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { folder: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { folder: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { folder: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const item of mipmapSizes) {
    const targetDir = path.join(resDir, item.folder);
    if (!fs.existsSync(targetDir)) continue;

    // 1. Foreground
    await sharp(Buffer.from(foregroundSvg))
      .resize(item.fgSize, item.fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    // 2. Icon (legacy square with rounded corners)
    await sharp(Buffer.from(fullIconSvg))
      .resize(item.iconSize, item.iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 3. Round Icon
    await sharp(Buffer.from(roundIconSvg))
      .resize(item.iconSize, item.iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    console.log(`Generated icons for ${item.folder}`);
  }

  // Also update public PWA icons and favicons
  const publicDir = path.resolve('public');
  await sharp(Buffer.from(fullIconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  await sharp(Buffer.from(fullIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), fullIconSvg.trim());
  console.log('Generated public PWA icons and favicon.svg successfully');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
