import { chromium } from "@playwright/test";

const url = process.argv[2] || "http://127.0.0.1:4179/";
const browser = await chromium.launch();
const shots = [
  ["desk", 1440, 900, false],
  ["mob", 390, 844, true],
];
for (const [name, width, height, mobile] of shots) {
  const page = await browser.newPage({
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `.reskin/view-${name}.png` });
  await page.close();
}
await browser.close();
console.log("shots written");
