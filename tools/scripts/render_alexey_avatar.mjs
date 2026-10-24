import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('discord_branding');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function render() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px;
      height: 1024px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #060913;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      position: relative;
      width: 1024px;
      height: 1024px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 50%, #0d1933 0%, #080e1e 50%, #04060c 100%);
    }
    .ambient-glow {
      position: absolute;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(37, 99, 235, 0.18) 35%, rgba(15, 23, 42, 0) 70%);
      filter: blur(40px);
      pointer-events: none;
    }
    .secondary-glow {
      position: absolute;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 210, 255, 0.35) 0%, rgba(29, 78, 216, 0.25) 50%, transparent 80%);
      filter: blur(25px);
      pointer-events: none;
    }
    svg.avatar-svg {
      position: relative;
      z-index: 2;
      width: 1024px;
      height: 1024px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="ambient-glow"></div>
    <div class="secondary-glow"></div>

    <svg class="avatar-svg" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Blue Gradients -->
        <linearGradient id="blueBlade" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stop-color="#7dd3fc" />
          <stop offset="35%" stop-color="#38bdf8" />
          <stop offset="70%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>

        <linearGradient id="innerGleam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.0" />
        </linearGradient>

        <radialGradient id="gemGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="30%" stop-color="#67e8f9" />
          <stop offset="70%" stop-color="#06b6d4" />
          <stop offset="100%" stop-color="#0284c7" />
        </radialGradient>

        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5" />
          <stop offset="50%" stop-color="#1d4ed8" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.4" />
        </linearGradient>

        <!-- Glow Filters -->
        <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" result="blur1" />
          <feGaussianBlur stdDeviation="30" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="gemNeon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Background Tech / Arcane Rings -->
      <circle cx="512" cy="512" r="476" fill="none" stroke="url(#ringGrad)" stroke-width="2.5" stroke-dasharray="8 6" opacity="0.6" />
      <circle cx="512" cy="512" r="450" fill="none" stroke="#1e3a8a" stroke-width="1.5" opacity="0.4" />
      <circle cx="512" cy="512" r="424" fill="none" stroke="#0284c7" stroke-width="1" stroke-dasharray="2 12" opacity="0.5" />

      <!-- Faceted Outer D20 / Hexagonal Cyber-Rune Cage -->
      <polygon points="512,96 872,304 872,720 512,928 152,720 152,304" 
               fill="none" stroke="#1d4ed8" stroke-width="2.5" opacity="0.35" />
      
      <!-- D20 internal triangulation chords -->
      <line x1="512" y1="96" x2="512" y2="928" stroke="#1e40af" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.25" />
      <line x1="152" y1="304" x2="872" y2="720" stroke="#1e40af" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.2" />
      <line x1="152" y1="720" x2="872" y2="304" stroke="#1e40af" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.2" />

      <!-- Outer D20 Nodes -->
      <circle cx="512" cy="96" r="5" fill="#38bdf8" opacity="0.8" />
      <circle cx="872" cy="304" r="5" fill="#38bdf8" opacity="0.8" />
      <circle cx="872" cy="720" r="5" fill="#38bdf8" opacity="0.8" />
      <circle cx="512" cy="928" r="5" fill="#38bdf8" opacity="0.8" />
      <circle cx="152" cy="720" r="5" fill="#38bdf8" opacity="0.8" />
      <circle cx="152" cy="304" r="5" fill="#38bdf8" opacity="0.8" />

      <!-- Inner Hexagonal Shield backing -->
      <polygon points="512,185 795,348 795,676 512,839 229,676 229,348" 
               fill="#091326" fill-opacity="0.85" stroke="#1e40af" stroke-width="3" />

      <!-- Central TTRPG Helper Sword & Crest, Scaled Perfectly -->
      <!-- Original viewBox is 50 40 180 180, center is 140, 130 -->
      <g transform="translate(512, 512) scale(4.1) translate(-140, -130)" filter="url(#neonGlow)">
        <!-- Sword Silhouette and Hexagon Shield -->
        <path
          fill="url(#blueBlade)"
          fill-rule="evenodd"
          stroke="#38bdf8"
          stroke-width="5"
          stroke-linejoin="round"
          d="M140 52 L207.5 91 L207.5 169 L140 208 L72.5 169 L72.5 91 Z M108 84 H172 V99 H146 V160 L140 184 L134 160 V99 H108 Z"
        />

        <!-- Subtle Blade Edge Highlight -->
        <path
          d="M140 99 V184"
          stroke="#e0f2fe"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.8"
        />

        <!-- Radiant Cyan Orb / Critical Gem -->
        <circle cx="207.5" cy="91" r="10" fill="url(#gemGlow)" stroke="#e0f2fe" stroke-width="1.5" filter="url(#gemNeon)" />
      </g>

      <!-- Vignette and Dark Circular Avatar Border -->
      <circle cx="512" cy="512" r="510" fill="none" stroke="rgba(56, 189, 248, 0.4)" stroke-width="4" />
    </svg>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  const dest1024 = path.join(outputDir, 'alexeymaster67_avatar_darkblue_1024x1024.png');
  await page.screenshot({ path: dest1024 });
  console.log('Saved:', dest1024);

  // Resize / render 512x512
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  const dest512 = path.join(outputDir, 'alexeymaster67_avatar_darkblue_512x512.png');
  await page.screenshot({ path: dest512 });
  console.log('Saved:', dest512);

  // Also save a copy to project root for easy access
  fs.copyFileSync(dest1024, path.resolve('AlexeyMaster67_Avatar_DarkBlue_1024x1024.png'));
  fs.copyFileSync(dest512, path.resolve('AlexeyMaster67_Avatar_DarkBlue_512x512.png'));

  await browser.close();
  console.log('Rendering complete!');
}

render().catch(console.error);
