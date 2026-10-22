import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const RPC = "**/rpc.testnet.chain.robinhood.com/**";
async function emptyRegistry(route) {
  const payload = route.request().postDataJSON();
  await route.fulfill({
    json: { jsonrpc: "2.0", id: payload.id, result: "0x" + "0".repeat(64) },
  });
}
test.beforeEach(async ({ page }) => {
  await page.route(RPC, emptyRegistry);
  await page.goto("/");
});
test("search, filter, sorting, and no-results recovery", async ({ page }) => {
  await expect(page).toHaveTitle("Probiuna — Follow the source. Test the claim.");
  await expect(page.locator(".pb-row")).toHaveCount(3);
  await page.getByLabel("Search projects").fill("ORB");
  await expect(page.locator(".pb-row")).toHaveCount(1);
  await expect(page.locator(".pb-row h3")).toHaveText("Orbitals");
  await page.getByLabel("Search projects").fill("no-such-project");
  await expect(page.getByText("No signals found.")).toBeVisible();
  await page
    .locator(".pb-empty")
    .getByRole("button", { name: "Clear filters" })
    .click();
  await page
    .getByRole("button", { name: "Builder cadence", exact: true })
    .click();
  await expect(page.locator(".pb-row h3")).toHaveText("Lantern");
  await page.getByRole("button", { name: "All signals", exact: true }).click();
  await page.getByLabel("Sort projects").selectOption("liquidity");
  await expect(page.locator(".pb-row h3")).toHaveText([
    "Orbitals",
    "Lantern",
    "Morrow",
  ]);
  await page.getByLabel("Sort projects").selectOption("name");
  await expect(page.locator(".pb-row h3")).toHaveText([
    "Lantern",
    "Morrow",
    "Orbitals",
  ]);
});
test("saved signals persist, deep-link, and can be removed", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Save Lantern", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unsave Lantern" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: /Saved signals/ })
    .click();
  await expect(page).toHaveURL(/#saved$/);
  await expect(page.locator(".pb-row")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".pb-row h3")).toHaveText("Lantern");
  await page.getByRole("button", { name: "Unsave Lantern" }).click();
  await expect(
    page.getByText("Your next good find belongs here."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore all projects" }).click();
  await expect(page.locator(".pb-row")).toHaveCount(3);
});
test("evidence dialog supports keyboard focus, saving, and Escape", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Open Lantern evidence" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Lantern" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/fictional sample project/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save signal", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Remove from saved" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("methodology expands and downloads real content", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: /The methodology/ })
    .click();
  await page.locator("summary").filter({ hasText: "Community proof" }).click();
  await expect(page.getByText(/Multiple wallets can belong/)).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the methodology" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("probiuna-methodology.txt");
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  expect(text).toContain("Probiuna");
  expect(text).toContain("Holder breadth: 28%");
  expect(text).toContain("fictional sample");
});
test("submission validation and missing-wallet errors retain details", async ({
  page,
}) => {
  await page
    .locator("#builders")
    .getByRole("button", { name: "Submit a project" })
    .click();
  const dialog = page.locator(".pb-dialog--submit");
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Enter a project slug to continue.",
  );
  await page.getByLabel("Project slug").fill("sample-builder");
  await page.getByLabel("Metadata link").fill("javascript:alert(1)");
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Use an IPFS");
  await page.getByLabel("Metadata link").fill("ipfs://example");
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "No browser wallet found",
  );
  await expect(page.getByLabel("Project slug")).toHaveValue("sample-builder");
  await page.keyboard.press("Escape");
  await page
    .locator("#builders")
    .getByRole("button", { name: "Submit a project" })
    .click();
  await expect(page.getByLabel("Project slug")).toHaveValue("sample-builder");
});
test("registry failure is recoverable without blocking discovery", async ({
  page,
}) => {
  await page.unroute(RPC);
  await page.route(RPC, (route) => route.abort("failed"));
  await page.reload();
  await expect(page.locator(".pb-registry-state")).toContainText(
    "could not be reached",
  );
  await expect(page.locator(".pb-row")).toHaveCount(3);
  await page.unroute(RPC);
  await page.route(RPC, emptyRegistry);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator(".pb-registry-state")).toContainText(
    "0 project entries registered",
  );
});
test("storage failure remains usable and signals session-only behavior", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.reload();
  await page.getByRole("button", { name: "Save Morrow", exact: true }).click();
  await expect(page.locator(".pb-toast")).toContainText(
    "saved for this session",
  );
  await expect(
    page.getByRole("button", { name: "Unsave Morrow" }),
  ).toBeVisible();
});
test("homepage and detail pass accessibility checks", async ({ page }) => {
  const homepage = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(homepage.violations).toEqual([]);
  await page.getByRole("button", { name: "Open Orbitals evidence" }).click();
  const detail = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(detail.violations).toEqual([]);
});

for (const legacyKey of [
  "sourcivell.saved.v1",
  "folisprig.saved.v1",
  "evidrindle.saved.v1",
  "tessivra.saved.v1",
  "velnori.saved.v1",
  "siglorer.saved.v1",
]) {
  test(`saved projects from ${legacyKey} migrate and remain removable`, async ({
    page,
  }) => {
    await page.evaluate(
      (key) => localStorage.setItem(key, '["lantern", "unknown-project"]'),
      legacyKey,
    );
    await page.reload();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: /Saved signals/ })
      .click();
    await expect(page.locator(".pb-row h3")).toHaveText("Lantern");
    expect(
      await page.evaluate(() => localStorage.getItem("probiuna.saved.v1")),
    ).toBe('["lantern"]');
    expect(
      await page.evaluate((key) => localStorage.getItem(key), legacyKey),
    ).toBeNull();
    await page.getByRole("button", { name: "Unsave Lantern" }).click();
    await page.reload();
    await expect(page.locator(".pb-row")).toHaveCount(0);
  });
}

test("an explicitly empty current watchlist cannot resurrect an older list", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem("probiuna.saved.v1", "[]");
    localStorage.setItem("tessivra.saved.v1", '["orbitals"]');
    localStorage.setItem("velnori.saved.v1", '["lantern"]');
    localStorage.setItem("siglorer.saved.v1", '["morrow"]');
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: /Saved signals/ })
    .click();
  await expect(page.locator(".pb-row")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("probiuna.saved.v1")),
  ).toBe("[]");
});
