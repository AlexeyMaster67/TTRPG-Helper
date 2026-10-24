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

  // -------------------------------------------------------------
  // VARIANT 1: Cutout "A" inside bluish hexagon (exact negative space like the sword)
  // At the top-right vertex: "67" in original red accent (#e5484d)
  // -------------------------------------------------------------
  const html1 = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px;
      height: 1024px;
      background: #0b1329;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 1024 1024" width="1024" height="1024">
    <!-- Solid Flat Dark Blue Background (NO GRADIENT) -->
    <rect width="1024" height="1024" fill="#0b1329" />

    <g transform="translate(512, 512)">
      <!-- 6-гранник (Hexagon) in Solid Bluish (#2563eb / #38bdf8) -->
      <!-- Hexagon scale: 4.2. Width: 567px, Height: 655px -->
      <!-- Hexagon vertices from center: (0, -328) (283.5, -164) (283.5, 164) (0, 328) (-283.5, 164) (-283.5, -164) -->
      <polygon
        points="0,-328 283.5,-164 283.5,164 0,328 -283.5,164 -283.5,-164"
        fill="#2563eb"
        stroke="#38bdf8"
        stroke-width="14"
        stroke-linejoin="round"
      />

      <!-- "A" INSIDE THE HEXAGON (Bold, crisp white cutout/fill) -->
      <text
        x="0"
        y="10"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="340"
        font-weight="900"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >A</text>

      <!-- Instead of red dot: "67" badge at the exact top-right vertex (283.5, -164) -->
      <circle cx="283.5" cy="-164" r="54" fill="#e5484d" stroke="#0b1329" stroke-width="8" />
      <text
        x="283.5"
        y="-161"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="44"
        font-weight="800"
        letter-spacing="-1"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >67</text>
    </g>
  </svg>
</body>
</html>
  `;

  await page.setContent(html1, { waitUntil: 'domcontentloaded' });
  const p1 = path.join(outputDir, 'alexey_hex_a67_v1.png');
  await page.screenshot({ path: p1 });
  console.log('Saved V1:', p1);

  // -------------------------------------------------------------
  // VARIANT 2: Steel / Cyan-bluish Hexagon (#38bdf8) with Dark Cutout "A" (revealing background)
  // Clean "67" badge at the top-right vertex
  // -------------------------------------------------------------
  const html2 = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px;
      height: 1024px;
      background: #091124;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 1024 1024" width="1024" height="1024">
    <!-- Solid Flat Dark Blue Background -->
    <rect width="1024" height="1024" fill="#091124" />

    <g transform="translate(512, 512)">
      <!-- Bluish Hexagon (#38bdf8 with solid stroke) -->
      <polygon
        points="0,-328 283.5,-164 283.5,164 0,328 -283.5,164 -283.5,-164"
        fill="#38bdf8"
        stroke="#60a5fa"
        stroke-width="12"
        stroke-linejoin="round"
      />

      <!-- "A" Cutout in the same color as background (negative space) -->
      <text
        x="0"
        y="12"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="340"
        font-weight="900"
        fill="#091124"
        text-anchor="middle"
        dominant-baseline="central"
      >A</text>

      <!-- "67" at top-right vertex in solid red badge -->
      <circle cx="283.5" cy="-164" r="54" fill="#e5484d" stroke="#091124" stroke-width="8" />
      <text
        x="283.5"
        y="-161"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="44"
        font-weight="800"
        letter-spacing="-1"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >67</text>
    </g>
  </svg>
</body>
</html>
  `;

  await page.setContent(html2, { waitUntil: 'domcontentloaded' });
  const p2 = path.join(outputDir, 'alexey_hex_a67_v2_cutout.png');
  await page.screenshot({ path: p2 });
  console.log('Saved V2:', p2);

  // -------------------------------------------------------------
  // VARIANT 3: Deep Royal Blue Hexagon (#1d4ed8) + Pure typography "67" at vertex (No circle, raw 67)
  // -------------------------------------------------------------
  const html3 = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px;
      height: 1024px;
      background: #070d1e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <svg viewBox="0 0 1024 1024" width="1024" height="1024">
    <!-- Solid Flat Dark Blue Background -->
    <rect width="1024" height="1024" fill="#070d1e" />

    <g transform="translate(512, 512)">
      <!-- Bluish Hexagon (#1d4ed8 fill, #38bdf8 stroke) -->
      <polygon
        points="0,-328 283.5,-164 283.5,164 0,328 -283.5,164 -283.5,-164"
        fill="#1e40af"
        stroke="#38bdf8"
        stroke-width="16"
        stroke-linejoin="round"
      />

      <!-- "A" Inside -->
      <text
        x="0"
        y="10"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="340"
        font-weight="900"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="central"
      >A</text>

      <!-- Raw Bold "67" in red (#e5484d) right at the top-right corner with subtle stroke -->
      <text
        x="290"
        y="-164"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="78"
        font-weight="900"
        fill="#e5484d"
        stroke="#070d1e"
        stroke-width="12"
        paint-order="stroke fill"
        text-anchor="middle"
        dominant-baseline="central"
      >67</text>
    </g>
  </svg>
</body>
</html>
  `;

  await page.setContent(html3, { waitUntil: 'domcontentloaded' });
  const p3 = path.join(outputDir, 'alexey_hex_a67_v3_raw67.png');
  await page.screenshot({ path: p3 });
  console.log('Saved V3:', p3);

  // Copy to root & brain
  const brainDir = 'C:\\Users\\alexeymaster67\\.gemini\\antigravity\\brain\\61e94732-df6b-4044-8891-bc4361d60d8a';
  fs.copyFileSync(p1, path.resolve('AlexeyMaster67_Hex_A67_V1_SolidBlue.png'));
  fs.copyFileSync(p2, path.resolve('AlexeyMaster67_Hex_A67_V2_Cutout.png'));
  fs.copyFileSync(p3, path.resolve('AlexeyMaster67_Hex_A67_V3_RoyalBlue.png'));

  fs.copyFileSync(p1, path.join(brainDir, 'alexey_hex_a67_v1.png'));
  fs.copyFileSync(p2, path.join(brainDir, 'alexey_hex_a67_v2.png'));
  fs.copyFileSync(p3, path.join(brainDir, 'alexey_hex_a67_v3.png'));

  await browser.close();
  console.log('Finished rendering Hexagon A67 variants!');
}

render().catch(console.error);
