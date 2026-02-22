import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function captureImages() {
  const browser = await chromium.launch();

  // Cover image: 1024x576 (16:9)
  const coverPage = await browser.newPage({
    viewport: { width: 1024, height: 576 },
    deviceScaleFactor: 2,
  });
  await coverPage.goto(`file://${resolve(__dirname, 'cover.html')}`);
  await coverPage.waitForTimeout(1000);
  await coverPage.screenshot({
    path: resolve(__dirname, 'screenshots', 'discord-cover.png'),
    fullPage: false,
  });
  console.log('Cover image saved: discord-cover.png (2048x1152)');

  // Banner image: 680x240 (17:6)
  const bannerPage = await browser.newPage({
    viewport: { width: 680, height: 240 },
    deviceScaleFactor: 2,
  });
  await bannerPage.goto(`file://${resolve(__dirname, 'banner.html')}`);
  await bannerPage.waitForTimeout(1000);
  await bannerPage.screenshot({
    path: resolve(__dirname, 'screenshots', 'discord-banner.png'),
    fullPage: false,
  });
  console.log('Banner image saved: discord-banner.png (1360x480)');

  await browser.close();
}

captureImages();
