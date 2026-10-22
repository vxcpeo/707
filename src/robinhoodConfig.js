import deployment from "./deployment.json";

export const ROBINHOOD_CHAIN_ID = Number(
  import.meta.env.VITE_CHAIN_ID || deployment.chainId || 46630,
);
export const ROBINHOOD_NETWORK =
  deployment.network || "Robinhood Chain Testnet";
export const ROBINHOOD_RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  deployment.rpcUrl ||
  "https://rpc.testnet.chain.robinhood.com/rpc";
export const ROBINHOOD_EXPLORER =
  import.meta.env.VITE_EXPLORER_URL ||
  deployment.explorer ||
  "https://explorer.testnet.chain.robinhood.com";
export const REGISTRY_ADDRESS =
  import.meta.env.VITE_REGISTRY_ADDRESS || deployment.address || "";

export function explorerAddressUrl(address) {
  return `${ROBINHOOD_EXPLORER.replace(/\/$/, "")}/address/${address}`;
}

export function explorerTransactionUrl(hash) {
  return `${ROBINHOOD_EXPLORER.replace(/\/$/, "")}/tx/${hash}`;
}
