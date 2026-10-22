import { chromium } from "@playwright/test";

const url = process.argv[2] || "http://127.0.0.1:4179/";
const width = Number(process.argv[3] || 390);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 844 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const result = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 90),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        scroll: el.scrollWidth,
      });
    }
  }
  return {
    vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
    offenders: out.slice(0, 30),
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
