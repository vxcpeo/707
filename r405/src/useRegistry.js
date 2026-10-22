import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  BrowserProvider,
  Contract,
  FetchRequest,
  JsonRpcProvider,
  isAddress,
} from "ethers";
import { registryAbi } from "./registryAbi.js";
import {
  REGISTRY_ADDRESS,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER,
  ROBINHOOD_NETWORK,
  ROBINHOOD_RPC_URL,
  explorerAddressUrl,
  explorerTransactionUrl,
} from "./robinhoodConfig.js";

// Prior product prefixes are read-only migration inputs; Probiuna is the only active prefix.
const LEGACY_BRANDS = ["sourcivell", "folisprig", "evidrindle", "tessivra", "velnori", "siglorer"];

function messageFor(error) {
  if (
    error?.code === 4001 ||
    error?.code === "ACTION_REJECTED" ||
    error?.info?.error?.code === 4001
  )
    return "The wallet request was declined. Your details are kept; you can try again.";
  if (error?.code === "INSUFFICIENT_FUNDS")
    return "Your wallet needs testnet ETH for gas. Fund it and try again.";
  if (`${error?.shortMessage} ${error?.message}`.includes("DuplicateSlug"))
    return "This project slug is already registered. Choose another slug and try again.";
  if (error?.code === "NETWORK_ERROR")
    return "The wallet network changed. Reconnect to Robinhood Chain Testnet and try again.";
  return (
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "The request failed. Please try again."
  );
}

function createRpcProvider() {
  const request = new FetchRequest(ROBINHOOD_RPC_URL);
  request.timeout = 10000;
  return new JsonRpcProvider(request, ROBINHOOD_CHAIN_ID, {
    staticNetwork: true,
    batchMaxCount: 1,
  });
}

export function useRegistry(notify) {
  const registryReady = computed(
    () => isAddress(REGISTRY_ADDRESS) && !/^0x0+$/i.test(REGISTRY_ADDRESS),
  );
  const registryAddress = REGISTRY_ADDRESS || "Not configured";
  const explorerUrl = computed(() => explorerAddressUrl(registryAddress));
  const wallet = ref({ address: "", chainId: null });
  const connecting = ref(false);
  const transaction = ref({ phase: "idle", hash: "", error: "" });
  const registryState = ref("loading");
  const registryCount = ref(null);
  const registryEntries = ref([]);
  const pendingKey = `probiuna.pending.${registryAddress.toLowerCase()}`;
  const legacyPendingKeys = LEGACY_BRANDS.map(
    (brand) => `${brand}.pending.${registryAddress.toLowerCase()}`,
  );
  const checkingConfirmation = ref(false);
  let readProvider;
  let confirmationProvider;
  let disposed = false;

  function storePending(hash) {
    try {
      sessionStorage.setItem(pendingKey, hash);
      for (const key of legacyPendingKeys) sessionStorage.removeItem(key);
    } catch {
      // Confirmation stays available in this view when browser storage is blocked.
    }
  }

  function clearPending() {
    for (const key of [pendingKey, ...legacyPendingKeys]) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Keep clearing the remaining compatibility keys.
      }
    }
  }

  async function getSigner() {
    if (!window.ethereum)
      throw new Error(
        "No browser wallet found. Install MetaMask or Rabby, then return and try again. Your form details are kept.",
      );

    await window.ethereum.request({ method: "eth_requestAccounts" });
    const targetChain = `0x${ROBINHOOD_CHAIN_ID.toString(16)}`;
    let currentChain = await window.ethereum.request({ method: "eth_chainId" });

    if (Number(currentChain) !== ROBINHOOD_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChain }],
        });
      } catch (error) {
        if (Number(error.code ?? error?.data?.originalError?.code) !== 4902)
          throw error;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetChain,
              chainName: ROBINHOOD_NETWORK,
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: [ROBINHOOD_RPC_URL],
              blockExplorerUrls: [ROBINHOOD_EXPLORER],
            },
          ],
        });
      }
      currentChain = await window.ethereum.request({ method: "eth_chainId" });
      if (Number(currentChain) !== ROBINHOOD_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChain }],
        });
      }
    }

    currentChain = await window.ethereum.request({ method: "eth_chainId" });
    if (Number(currentChain) !== ROBINHOOD_CHAIN_ID)
      throw new Error(`Switch your wallet to ${ROBINHOOD_NETWORK} to continue.`);

    const provider = new BrowserProvider(window.ethereum, ROBINHOOD_CHAIN_ID);
    try {
      const signer = await provider.getSigner();
      wallet.value = {
        address: await signer.getAddress(),
        chainId: ROBINHOOD_CHAIN_ID,
      };
      return { signer, provider };
    } catch (error) {
      provider.destroy();
      throw error;
    }
  }

  async function connectWallet() {
    if (
      connecting.value ||
      ["signature", "confirming"].includes(transaction.value.phase)
    )
      return;
    connecting.value = true;
    try {
      const { provider } = await getSigner();
      provider.destroy();
      notify(`Wallet connected to ${ROBINHOOD_NETWORK}.`);
    } catch (error) {
      notify(messageFor(error));
    } finally {
      connecting.value = false;
    }
  }

  async function loadRegistry() {
    if (!registryReady.value) {
      registryState.value = "unconfigured";
      registryCount.value = null;
      registryEntries.value = [];
      return;
    }
    if (readProvider) return;

    registryState.value = "loading";
    readProvider = createRpcProvider();
    try {
      const contract = new Contract(registryAddress, registryAbi, readProvider);
      const count = Number(await contract.nextPulseId());
      const entries = await Promise.all(
        Array.from({ length: Math.min(count, 3) }, async (_, index) => {
          const id = count - index;
          const pulse = await contract.pulses(id);
          return { id, slug: pulse.slug, active: pulse.active };
        }),
      );
      if (!disposed) {
        registryCount.value = count;
        registryEntries.value = entries;
        registryState.value = "ready";
      }
    } catch {
      if (!disposed) {
        registryState.value = "error";
        registryEntries.value = [];
      }
    } finally {
      readProvider?.destroy();
      readProvider = null;
    }
  }

  async function submitPulse(slug, uri) {
    if (
      ["signature", "confirming", "pending"].includes(transaction.value.phase) ||
      !registryReady.value
    )
      return false;

    transaction.value = { phase: "signature", hash: "", error: "" };
    let walletProvider;
    try {
      const { signer, provider } = await getSigner();
      walletProvider = provider;
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      if (Number(chain) !== ROBINHOOD_CHAIN_ID)
        throw new Error(`Switch your wallet to ${ROBINHOOD_NETWORK} and try again.`);

      const contract = new Contract(registryAddress, registryAbi, signer);
      const response = await contract.submitPulse(slug, uri);
      transaction.value = { phase: "confirming", hash: response.hash, error: "" };
      storePending(response.hash);
      walletProvider.destroy();
      walletProvider = null;
      return await checkConfirmation();
    } catch (error) {
      const broadcastHash = error?.transactionHash || error?.info?.sendTransactionHash;
      if (/^0x[\da-f]{64}$/i.test(broadcastHash || "")) {
        transaction.value = { phase: "confirming", hash: broadcastHash, error: "" };
        storePending(broadcastHash);
        walletProvider?.destroy();
        walletProvider = null;
        return await checkConfirmation();
      }
      transaction.value = {
        ...transaction.value,
        phase: "error",
        error: messageFor(error),
      };
      return false;
    } finally {
      walletProvider?.destroy();
    }
  }

  async function checkConfirmation() {
    if (checkingConfirmation.value || !transaction.value.hash) return false;
    checkingConfirmation.value = true;
    transaction.value.phase = "confirming";
    transaction.value.error = "";
    confirmationProvider = createRpcProvider();
    try {
      const receipt = await confirmationProvider.waitForTransaction(
        transaction.value.hash,
        1,
        60000,
      );
      if (!receipt) throw new Error("Confirmation is still pending.");
      if (receipt.status !== 1) {
        clearPending();
        transaction.value.phase = "error";
        transaction.value.error =
          "The transaction reverted on testnet. Your details are kept; check the explorer before trying again.";
        return false;
      }
      clearPending();
      transaction.value.phase = "success";
      notify(`Your project entry is confirmed on ${ROBINHOOD_NETWORK}.`);
      loadRegistry();
      return true;
    } catch {
      transaction.value.phase = "pending";
      transaction.value.error =
        "Your transaction was sent, but confirmation is not available yet. Recheck its status or open the explorer. If you replaced or cancelled it in your wallet, check that replacement there before taking further action.";
      return false;
    } finally {
      checkingConfirmation.value = false;
      confirmationProvider?.destroy();
      confirmationProvider = null;
    }
  }

  function accountsChanged(accounts) {
    wallet.value = {
      ...wallet.value,
      address: wallet.value.chainId === ROBINHOOD_CHAIN_ID ? accounts?.[0] || "" : "",
    };
  }

  function chainChanged(chain) {
    wallet.value = { ...wallet.value, chainId: Number(chain) };
    if (wallet.value.address && Number(chain) !== ROBINHOOD_CHAIN_ID) {
      wallet.value.address = "";
      notify("Wallet network changed. Reconnect to Robinhood Chain Testnet.");
    }
  }

  function disconnected() {
    wallet.value = { address: "", chainId: null };
  }

  onMounted(() => {
    try {
      const current = sessionStorage.getItem(pendingKey);
      const hash =
        current === null
          ? legacyPendingKeys
              .map((key) => sessionStorage.getItem(key))
              .find((value) => value !== null)
          : current;
      if (/^0x[\da-f]{64}$/i.test(hash || "")) {
        transaction.value = {
          phase: "pending",
          hash,
          error: "A previous submission is awaiting confirmation. Recheck its status before submitting again.",
        };
        storePending(hash);
      }
    } catch {
      // Browser storage is optional.
    }
    window.ethereum?.on?.("accountsChanged", accountsChanged);
    window.ethereum?.on?.("chainChanged", chainChanged);
    window.ethereum?.on?.("disconnect", disconnected);
  });

  onUnmounted(() => {
    disposed = true;
    readProvider?.destroy();
    confirmationProvider?.destroy();
    window.ethereum?.removeListener?.("accountsChanged", accountsChanged);
    window.ethereum?.removeListener?.("chainChanged", chainChanged);
    window.ethereum?.removeListener?.("disconnect", disconnected);
  });

  return {
    wallet,
    connecting,
    transaction,
    registryState,
    registryCount,
    registryEntries,
    registryAddress,
    registryReady,
    explorerUrl,
    explorerAddressUrl,
    explorerTransactionUrl,
    network: ROBINHOOD_NETWORK,
    chainId: ROBINHOOD_CHAIN_ID,
    connectWallet,
    loadRegistry,
    submitPulse,
    checkConfirmation,
  };
}
