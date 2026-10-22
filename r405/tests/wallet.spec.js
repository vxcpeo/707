import { test, expect } from "@playwright/test";
import {
  installWalletMock,
  openSubmission,
  walletRequests,
  SECOND_ACCOUNT,
  TRANSACTION_HASH,
  REGISTRY,
} from "./helpers/wallet-mock.js";

test("declined wallet connection recovers without another authorization request", async ({
  page,
}) => {
  await installWalletMock(page, { rejectConnect: true });
  await page.goto("/");
  const connect = page.getByRole("button", {
    name: "Connect wallet",
    exact: true,
  });
  await connect.click();
  await expect(page.getByText(/wallet request was declined/i)).toBeVisible();
  await expect(connect).toBeEnabled();
  expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(1);
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(0);
});

test("adds an unknown chain and wallet events never trigger authorization", async ({
  page,
}) => {
  await installWalletMock(page, { chainId: "0x1", needsAddChain: true });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await expect(page.locator(".pb-wallet")).toContainText("0x1111");
  const additions = await walletRequests(page, "wallet_addEthereumChain");
  expect(additions).toHaveLength(1);
  expect(additions[0].params[0].chainId).toBe(`0x${(46630).toString(16)}`);
  expect(additions[0].params[0].rpcUrls).toEqual([
    "https://rpc.testnet.chain.robinhood.com/rpc",
  ]);
  await page.evaluate(
    (address) => window.__walletMock.emit("accountsChanged", [address]),
    SECOND_ACCOUNT,
  );
  await expect(page.locator(".pb-wallet")).toContainText("0x2222");
  await page.evaluate(() => window.__walletMock.emit("chainChanged", "0x1"));
  await expect(page.locator(".pb-wallet")).toHaveText("Connect wallet");
  await page.evaluate(
    (address) => window.__walletMock.emit("accountsChanged", [address]),
    SECOND_ACCOUNT,
  );
  await expect(page.locator(".pb-wallet")).toHaveText("Connect wallet");
  await page.evaluate(() => window.__walletMock.emit("accountsChanged", []));
  expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(1);
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(0);
});

test("signature rejection preserves entered details and allows a deliberate retry", async ({
  page,
}) => {
  await installWalletMock(page, { rejectTransaction: true });
  await page.goto("/");
  const dialog = await openSubmission(page);
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    /wallet request was declined/i,
  );
  await expect(page.getByLabel("Project slug", { exact: false })).toHaveValue(
    "probiuna-test-project",
  );
  await expect(page.getByLabel("Metadata link", { exact: false })).toHaveValue(
    "ipfs://probiuna/test-project",
  );
  await expect(
    dialog.getByRole("button", { name: "Submit to testnet registry" }),
  ).toBeEnabled();
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);
  await expect(dialog.getByText("Your project is on the record.")).toHaveCount(
    0,
  );
});

test("rapid submit stays single, waits for a receipt, and survives wallet network changes", async ({
  page,
}) => {
  const rpc = await installWalletMock(page, { holdSignature: true });
  await page.goto("/");
  const dialog = await openSubmission(page);
  const submit = dialog.locator('button[type="submit"]');
  // Two browser click events in one task exercise the synchronous submission guard.
  await submit.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(dialog.getByRole("status")).toContainText(
    /Review the request in your wallet/,
  );
  await expect
    .poll(
      async () => (await walletRequests(page, "eth_sendTransaction")).length,
    )
    .toBe(1);
  await expect(submit).toBeDisabled();
  await expect(dialog.getByText("Your project is on the record.")).toHaveCount(
    0,
  );

  await page.evaluate(() => window.__walletMock.approve());
  await expect(dialog.getByRole("status")).toContainText(
    /Waiting for confirmation/,
  );
  await expect(
    dialog.getByRole("link", { name: "Track transaction" }),
  ).toHaveAttribute("href", new RegExp(TRANSACTION_HASH));
  await expect(dialog.getByText("Your project is on the record.")).toHaveCount(
    0,
  );
  await expect
    .poll(
      () =>
        rpc.readRequests.filter(
          (method) => method === "eth_getTransactionReceipt",
        ).length,
    )
    .toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__walletMock.emit("chainChanged", "0x1");
    window.__walletMock.emit("accountsChanged", []);
  });
  await expect(submit).toBeDisabled();
  expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(1);
  rpc.receiptStatus = 1;
  await expect(
    dialog.getByRole("heading", { name: "Your project is on the record." }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    dialog.getByRole("link", { name: "View transaction" }),
  ).toHaveAttribute("href", new RegExp(TRANSACTION_HASH));
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);
  await dialog.getByRole("button", { name: "Back to discovery" }).click();
  await page
    .getByRole("button", { name: "Submit a project", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Project slug", { exact: false })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Metadata link", { exact: false })).toHaveValue(
    "",
  );
});

test("a reverted receipt never reports success and keeps form values", async ({
  page,
}) => {
  await installWalletMock(page, { publicState: { receiptStatus: 0 } });
  await page.goto("/");
  const dialog = await openSubmission(page);
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    /not successful|revert|failed/i,
  );
  await expect(page.getByLabel("Project slug", { exact: false })).toHaveValue(
    "probiuna-test-project",
  );
  await expect(page.getByLabel("Metadata link", { exact: false })).toHaveValue(
    "ipfs://probiuna/test-project",
  );
  await expect(dialog.getByText("Your project is on the record.")).toHaveCount(
    0,
  );
  await expect(dialog.locator('button[type="submit"]')).toBeEnabled();
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);
});

test("an already-broadcast hash survives a wallet transaction lookup error", async ({
  page,
}) => {
  const rpc = await installWalletMock(page, { badTransactionLookup: true });
  await page.goto("/");
  const dialog = await openSubmission(page);
  await dialog.getByRole("button", { name: "Connect wallet & submit" }).click();
  await expect(
    dialog.getByRole("link", { name: "Track transaction" }),
  ).toHaveAttribute("href", new RegExp(TRANSACTION_HASH));
  await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
  await expect
    .poll(
      () =>
        rpc.readRequests.filter(
          (method) => method === "eth_getTransactionReceipt",
        ).length,
    )
    .toBeGreaterThan(0);
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);
  rpc.receiptStatus = 1;
  await expect(
    dialog.getByRole("heading", { name: "Your project is on the record." }),
  ).toBeVisible({ timeout: 12000 });
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);
});

for (const legacyBrand of [
  "sourcivell",
  "folisprig",
  "evidrindle",
  "tessivra",
  "velnori",
  "siglorer",
]) {
  test(`unconfirmed ${legacyBrand} submissions migrate and recheck without another transaction`, async ({
    page,
  }) => {
    const pendingKey = `probiuna.pending.${REGISTRY.toLowerCase()}`;
    const legacyPendingKey = `${legacyBrand}.pending.${REGISTRY.toLowerCase()}`;
    const rpc = await installWalletMock(page);
    await page.clock.install();
    await page.goto("/");
    let dialog = await openSubmission(page);
    await dialog
      .getByRole("button", { name: "Connect wallet & submit" })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      /Waiting for confirmation/,
    );
    await expect
      .poll(
        () =>
          rpc.readRequests.filter(
            (method) => method === "eth_getTransactionReceipt",
          ).length,
      )
      .toBeGreaterThan(0);
    await page.clock.fastForward(61000);
    await expect(
      dialog.getByRole("button", { name: "Recheck confirmation" }),
    ).toBeVisible();
    await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.getByLabel("Project slug", { exact: false })).toHaveValue(
      "probiuna-test-project",
    );
    expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(1);

    expect(
      await page.evaluate((key) => sessionStorage.getItem(key), pendingKey),
    ).toBe(TRANSACTION_HASH);
    // Simulate a pending record created by the preceding release before reload.
    await page.evaluate(
      ({ pendingKey, legacyPendingKey }) => {
        sessionStorage.setItem(
          legacyPendingKey,
          sessionStorage.getItem(pendingKey),
        );
        sessionStorage.removeItem(pendingKey);
      },
      { pendingKey, legacyPendingKey },
    );
    await page.reload();
    await page
      .getByRole("button", { name: "Check pending submission", exact: true })
      .first()
      .click();
    dialog = page.locator(".pb-dialog--submit");
    await expect(
      dialog.getByRole("link", { name: "Track transaction" }),
    ).toHaveAttribute("href", new RegExp(TRANSACTION_HASH));
    await expect(
      dialog.getByRole("button", { name: "Recheck confirmation" }),
    ).toBeVisible();
    await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
    expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(0);
    expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(0);
    expect(
      await page.evaluate((key) => sessionStorage.getItem(key), pendingKey),
    ).toBe(TRANSACTION_HASH);
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        legacyPendingKey,
      ),
    ).toBeNull();

    // Completion must also discard a stale legacy record instead of resurrecting it.
    await page.evaluate(
      ({ legacyPendingKey, hash }) =>
        sessionStorage.setItem(legacyPendingKey, hash),
      { legacyPendingKey, hash: TRANSACTION_HASH },
    );
    rpc.receiptStatus = 1;
    await dialog.getByRole("button", { name: "Recheck confirmation" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Your project is on the record." }),
    ).toBeVisible();
    expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(0);
    expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(0);
    expect(
      await page.evaluate((key) => sessionStorage.getItem(key), pendingKey),
    ).toBeNull();
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        legacyPendingKey,
      ),
    ).toBeNull();
    await dialog.getByRole("button", { name: "Back to discovery" }).click();
    await page
      .getByRole("button", { name: "Submit a project", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Project slug", { exact: false })).toHaveValue(
      "",
    );
    await expect(
      page.getByLabel("Metadata link", { exact: false }),
    ).toHaveValue("");
  });
}

test("current pending submission takes precedence over all older releases", async ({
  page,
}) => {
  const pendingKey = `probiuna.pending.${REGISTRY.toLowerCase()}`;
  const legacyKeys = [
    "sourcivell",
    "folisprig",
    "evidrindle",
    "tessivra",
    "velnori",
    "siglorer",
  ].map((brand) => `${brand}.pending.${REGISTRY.toLowerCase()}`);
  await installWalletMock(page);
  await page.addInitScript(
    ({ pendingKey, legacyKeys, hash }) => {
      sessionStorage.setItem(pendingKey, hash);
      for (const key of legacyKeys)
        sessionStorage.setItem(key, `0x${"ef".repeat(32)}`);
    },
    { pendingKey, legacyKeys, hash: TRANSACTION_HASH },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Check pending submission", exact: true })
    .first()
    .click();
  const dialog = page.locator(".pb-dialog--submit");
  await expect(
    dialog.getByRole("link", { name: "Track transaction" }),
  ).toHaveAttribute("href", new RegExp(TRANSACTION_HASH));
  expect(
    await page.evaluate(
      (keys) => keys.map((key) => sessionStorage.getItem(key)),
      legacyKeys,
    ),
  ).toEqual(legacyKeys.map(() => null));
  expect(await walletRequests(page, "eth_requestAccounts")).toHaveLength(0);
  expect(await walletRequests(page, "eth_sendTransaction")).toHaveLength(0);
});
