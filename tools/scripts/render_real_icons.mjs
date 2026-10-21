import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const iconSvgPath = path.resolve('src/assets/icon.svg');
const logoSvgPath = path.resolve('src/assets/logo.svg');

const iconSvg = fs.readFileSync(iconSvgPath, 'utf8');
const logoSvg = fs.readFileSync(logoSvgPath, 'utf8');

const outputDir = path.resolve('discord_branding');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Transparent 1024x1024
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1024px;
            height: 1024px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          svg {
            width: 880px;
            height: 880px;
          }
        </style>
      </head>
      <body>
        ${iconSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const icon1024Trans = path.join(outputDir, 'app_icon_transparent_1024x1024.png');
  await page.screenshot({ path: icon1024Trans, omitBackground: true });
  console.log('Saved:', icon1024Trans);

  // 2. Transparent 512x512
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 512px;
            height: 512px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          svg {
            width: 440px;
            height: 440px;
          }
        </style>
      </head>
      <body>
        ${iconSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const icon512Trans = path.join(outputDir, 'app_icon_transparent_512x512.png');
  await page.screenshot({ path: icon512Trans, omitBackground: true });
  console.log('Saved:', icon512Trans);

  // 3. Discord Dark Server Icon 1024x1024 (with sleek dark background & glow)
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1024px;
            height: 1024px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111215;
            position: relative;
            overflow: hidden;
          }
          .glow {
            position: absolute;
            width: 750px;
            height: 750px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245, 185, 32, 0.28) 0%, rgba(229, 72, 77, 0.1) 45%, transparent 70%);
          }
          svg {
            position: relative;
            z-index: 2;
            width: 780px;
            height: 780px;
            filter: drop-shadow(0 16px 40px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 36px rgba(245, 185, 32, 0.45));
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        ${iconSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const discordDark1024 = path.join(outputDir, 'discord_server_icon_dark_1024x1024.png');
  await page.screenshot({ path: discordDark1024 });
  console.log('Saved:', discordDark1024);

  // 4. Discord Dark Server Icon 512x512
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 512px;
            height: 512px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #111215;
            position: relative;
            overflow: hidden;
          }
          .glow {
            position: absolute;
            width: 380px;
            height: 380px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245, 185, 32, 0.28) 0%, rgba(229, 72, 77, 0.1) 45%, transparent 70%);
          }
          svg {
            position: relative;
            z-index: 2;
            width: 390px;
            height: 390px;
            filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 18px rgba(245, 185, 32, 0.45));
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        ${iconSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const discordDark512 = path.join(outputDir, 'discord_server_icon_dark_512x512.png');
  await page.screenshot({ path: discordDark512 });
  console.log('Saved:', discordDark512);

  // 5. Horizontal Logo Banner Transparent (1360x480)
  await page.setViewport({ width: 1360, height: 480, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1360px;
            height: 480px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          svg {
            width: 1240px;
            height: 440px;
            filter: drop-shadow(0 0 24px rgba(245, 185, 32, 0.35));
          }
        </style>
      </head>
      <body>
        ${logoSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const logoTransPath = path.join(outputDir, 'ttrpg_helper_logo_transparent.png');
  await page.screenshot({ path: logoTransPath, omitBackground: true });
  console.log('Saved:', logoTransPath);

  // 6. Horizontal Logo Banner Dark (1360x480)
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1360px;
            height: 480px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0d0e12;
            position: relative;
            overflow: hidden;
          }
          .glow {
            position: absolute;
            left: 180px;
            top: 50%;
            transform: translateY(-50%);
            width: 400px;
            height: 400px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245, 185, 32, 0.22) 0%, transparent 70%);
          }
          svg {
            position: relative;
            z-index: 2;
            width: 1240px;
            height: 440px;
            filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 28px rgba(245, 185, 32, 0.35));
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        ${logoSvg}
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });

  const logoDarkPath = path.join(outputDir, 'ttrpg_helper_logo_banner_dark.png');
  await page.screenshot({ path: logoDarkPath });
  console.log('Saved:', logoDarkPath);

  await browser.close();

  // Root accessible copies in D:\TTRPG-Helper (non-public working folder)
  fs.copyFileSync(icon1024Trans, 'D:/TTRPG-Helper/TTRPG_Helper_Icon_Transparent_1024x1024.png');
  fs.copyFileSync(discordDark1024, 'D:/TTRPG-Helper/TTRPG_Helper_Discord_Icon_Dark_1024x1024.png');
  fs.copyFileSync(discordDark512, 'D:/TTRPG-Helper/TTRPG_Helper_Discord_Icon_Dark_512x512.png');
  fs.copyFileSync(logoDarkPath, 'D:/TTRPG-Helper/TTRPG_Helper_Banner_Dark.png');
  fs.copyFileSync(logoTransPath, 'D:/TTRPG-Helper/TTRPG_Helper_Banner_Transparent.png');

  console.log('SUCCESS: All official SVG branding rendered to high-res PNGs.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
