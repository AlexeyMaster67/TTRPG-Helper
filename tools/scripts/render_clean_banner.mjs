import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const logoSvgPath = path.resolve('src/assets/logo.svg');
const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

async function renderCleanBanner() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 384, deviceScaleFactor: 1 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1920px;
            height: 384px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0d0e12;
            position: relative;
            overflow: hidden;
          }
          .glow {
            position: absolute;
            left: 700px;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 380px;
            height: 380px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245, 185, 32, 0.28) 0%, transparent 70%);
          }
          svg {
            position: relative;
            z-index: 2;
            height: 250px;
            width: auto;
            filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 24px rgba(245, 185, 32, 0.35));
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        ${logoSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  await new Promise(r => setTimeout(r, 600));

  const outPath = path.resolve('TTRPG_Helper_Reddit_Banner_Clean.png');
  await page.screenshot({ path: outPath });
  console.log('Saved:', outPath);

  // Overwrite in D:\TTRPGHelper too
  fs.copyFileSync(outPath, 'D:/TTRPGHelper/TTRPG_Helper_Reddit_Banner_Clean.png');

  await browser.close();
}

renderCleanBanner().catch(console.error);
