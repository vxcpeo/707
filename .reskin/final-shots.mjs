import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:4195/";
const outDir = process.argv[3] || "../../output/playwright";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const results = [];
for (const width of [1440, 768, 390, 320]) {
  const height = width >= 1000 ? 1000 : width === 768 ? 900 : 844;
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await sleep(30);
    }
    window.scrollTo(0, 0);
    await sleep(150);
  });
  await page.waitForTimeout(300);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    height: document.documentElement.scrollHeight,
  }));
  const file = `${outDir}/probiuna-final-${width}.png`;
  await page.screenshot({ path: file, fullPage: true });
  results.push({ width, file, ...metrics, pageErrors: errors.length });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
