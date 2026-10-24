import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function renderBanners() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Read logo SVG if needed or render inline SVG
  // Dimensions for Reddit Banner: 1920 x 384 (Large / Standard) and 1920 x 256
  await page.setViewport({ width: 1920, height: 384, deviceScaleFactor: 1 });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1920px;
      height: 384px;
      background: #090e1a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
      position: relative;
    }

    /* Subtle Tactical Grid in Background */
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    /* Ambient Glow Behind Logo */
    .glow {
      position: absolute;
      width: 700px;
      height: 250px;
      background: radial-gradient(circle, rgba(245, 185, 32, 0.15) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 80%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    /* Vignette Overlay */
    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(5, 8, 15, 0.85) 100%);
      pointer-events: none;
    }

    .container {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 36px;
    }

    .logo-badge {
      width: 190px;
      height: 210px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      filter: drop-shadow(0 0 24px rgba(245, 185, 32, 0.45));
    }

    .text-block {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .title-row {
      display: flex;
      align-items: baseline;
      gap: 16px;
    }

    .brand-title {
      font-size: 88px;
      font-weight: 900;
      letter-spacing: 6px;
      color: #ffffff;
      line-height: 1;
      text-transform: uppercase;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
    }

    .brand-sub {
      font-size: 38px;
      font-weight: 700;
      letter-spacing: 14px;
      color: #94a3b8;
      text-transform: uppercase;
      margin-top: 2px;
      margin-left: 6px;
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
      margin-left: 6px;
    }

    .pill {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(18, 24, 38, 0.7);
      backdrop-filter: blur(8px);
      color: #cbd5e1;
    }

    .pill-gold {
      color: #f5b920;
      border-color: rgba(245, 185, 32, 0.4);
      background: rgba(245, 185, 32, 0.1);
      box-shadow: 0 0 12px rgba(245, 185, 32, 0.2);
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="glow"></div>
  <div class="vignette"></div>

  <div class="container">
    <!-- Clean Vector Logo Badge (Matching app icon) -->
    <div class="logo-badge">
      <svg viewBox="0 0 100 115.47" width="180" height="208">
        <defs>
          <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffc83b" />
            <stop offset="100%" stop-color="#e59800" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5" />
          </filter>
        </defs>

        <!-- Outer Glowing Hexagon -->
        <polygon points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87" fill="url(#hexGrad)" />

        <!-- Notification dot on top-right -->
        <circle cx="88" cy="18" r="8" fill="#ef4444" stroke="#090e1a" stroke-width="2.5" />

        <!-- Stylized "T" / Sword / Nail in Cutout -->
        <path d="M22 28 H78 V37 H55 V92 H45 V37 H22 Z" fill="#090e1a" filter="url(#shadow)" />
      </svg>
    </div>

    <!-- Typography -->
    <div class="text-block">
      <div class="brand-title">TTRPG</div>
      <div class="brand-sub">H E L P E R</div>
      <div class="badge-row">
        <span class="pill pill-gold">100% Offline VTT</span>
        <span class="pill">D&D 5E & 2024</span>
        <span class="pill">Pathfinder 2e</span>
        <span class="pill">Cyberpunk RED</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html);
  await new Promise(r => setTimeout(r, 600));

  const dest384 = path.resolve('TTRPG_Helper_Reddit_Banner_1920x384.png');
  await page.screenshot({ path: dest384 });
  console.log('Saved Reddit Banner (1920x384):', dest384);

  // Also render 1920x256 variant for medium banner
  await page.setViewport({ width: 1920, height: 256, deviceScaleFactor: 1 });
  const dest256 = path.resolve('TTRPG_Helper_Reddit_Banner_1920x256.png');
  await page.screenshot({ path: dest256 });
  console.log('Saved Reddit Banner (1920x256):', dest256);

  await browser.close();
}

renderBanners().catch(err => {
  console.error(err);
  process.exit(1);
});
