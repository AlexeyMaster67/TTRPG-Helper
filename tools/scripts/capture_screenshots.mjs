import puppeteer from 'puppeteer-core';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Combat Screen
  const combatPath = path.resolve('TTRPG_Helper_Combat_1920x1080.png');
  await page.screenshot({ path: combatPath });
  console.log('Saved Combat:', combatPath);

  // 2. Switch to Map tab
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('button[role="tab"]');
    if (tabs[1]) tabs[1].click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Open Generator
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const genBtn = buttons.find(b => b.textContent && (b.textContent.includes('Generator') || b.textContent.includes('Генератор')));
    if (genBtn) genBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Screenshot modal: Dungeon Architect
  const modalPath = path.resolve('TTRPG_Helper_Dungeon_Architect_1920x1080.png');
  await page.screenshot({ path: modalPath });
  console.log('Saved Dungeon Architect modal:', modalPath);

  // Click Apply button once enabled
  await page.evaluate(async () => {
    const findAndClick = () => {
      const modalButtons = Array.from(document.querySelectorAll('button'));
      const applyBtn = modalButtons.find(b => b.textContent && b.textContent.includes('Применить к текущей карте'));
      if (applyBtn && !applyBtn.disabled) {
        applyBtn.click();
        return true;
      }
      return false;
    };
    if (!findAndClick()) {
      // Retry after short delay
      setTimeout(findAndClick, 1000);
    }
  });

  await new Promise(r => setTimeout(r, 3000));

  // 4. BattleMap Screen with rendered dungeon
  const mapPath = path.resolve('TTRPG_Helper_BattleMap_1920x1080.png');
  await page.screenshot({ path: mapPath });
  console.log('Saved BattleMap:', mapPath);

  // 5. Switch to Split tab
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('button[role="tab"]');
    if (tabs[2]) tabs[2].click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // 6. Split View Screen
  const splitPath = path.resolve('TTRPG_Helper_SplitView_1920x1080.png');
  await page.screenshot({ path: splitPath });
  console.log('Saved SplitView:', splitPath);

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
