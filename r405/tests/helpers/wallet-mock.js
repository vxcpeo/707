export const ACCOUNT = '0x1111111111111111111111111111111111111111';
export const SECOND_ACCOUNT = '0x2222222222222222222222222222222222222222';
export const REGISTRY = '0xD182cb8c8486173EB4eCF411115A0DD6Cd119F20';
export const TRANSACTION_HASH = `0x${'ab'.repeat(32)}`;
const BLOCK_HASH = `0x${'cd'.repeat(32)}`;
const TARGET_CHAIN = `0x${(46630).toString(16)}`;
const RPC_URL = 'https://rpc.testnet.chain.robinhood.com/rpc';

/** All wallet calls and public RPC requests stay inside this deterministic mock. */
export async function installWalletMock(page, options = {}) {
  const state = { receiptStatus: null, readRequests: [], ...options.publicState };
  await page.route(RPC_URL, async route => {
    const payload = route.request().postDataJSON();
    function respond(request) {
      state.readRequests.push(request.method);
      let result;
      if (request.method === 'eth_chainId') result = TARGET_CHAIN;
      else if (request.method === 'eth_call') result = `0x${'0'.repeat(64)}`;
      else if (request.method === 'eth_blockNumber') result = state.receiptStatus === null ? '0xf' : '0x10';
      else if (request.method === 'eth_getTransactionReceipt') {
        result = state.receiptStatus === null ? null : {
          transactionHash: TRANSACTION_HASH, transactionIndex: '0x0', blockHash: BLOCK_HASH,
          blockNumber: '0x10', from: ACCOUNT, to: REGISTRY, cumulativeGasUsed: '0x5208',
          gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00', contractAddress: null,
          logs: [], logsBloom: `0x${'0'.repeat(512)}`, status: `0x${state.receiptStatus}`, type: '0x0',
        };
      } else return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Unmocked public RPC method: ${request.method}` } };
      return { jsonrpc: '2.0', id: request.id, result };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(Array.isArray(payload) ? payload.map(respond) : respond(payload)) });
  });

  await page.addInitScript(({ options, account, target, registry, hash }) => {
    const listeners = {};
    let approveSignature;
    let rejectSignature;
    const state = {
      chainId: options.chainId || target, accounts: [account], requests: [], sent: [],
      needsAddChain: options.needsAddChain || false, rejectConnect: options.rejectConnect || false,
      rejectTransaction: options.rejectTransaction || false, holdSignature: options.holdSignature || false,
    };
    const error = (code, message) => Object.assign(new Error(message), { code });
    const emit = (event, value) => {
      if (event === 'chainChanged') state.chainId = value;
      if (event === 'accountsChanged') state.accounts = value;
      for (const listener of listeners[event] || []) listener(value);
    };
    const transaction = () => ({
      hash, from: account, to: registry, input: state.sent[0]?.data || '0x',
      nonce: '0x0', gas: '0x200000', gasPrice: '0x3b9aca00', value: '0x0',
      chainId: target, type: '0x0', v: '0x1b', r: `0x${'0'.repeat(63)}1`, s: `0x${'0'.repeat(63)}2`,
      blockNumber: null, blockHash: null, transactionIndex: null,
    });
    const provider = {
      on(event, listener) { (listeners[event] ||= []).push(listener); return provider; },
      removeListener(event, listener) { listeners[event] = (listeners[event] || []).filter(item => item !== listener); return provider; },
      async request(request) {
        state.requests.push({ method: request.method, params: request.params });
        switch (request.method) {
          case 'eth_requestAccounts': if (state.rejectConnect) throw error(4001, 'User rejected account access'); return state.accounts;
          case 'eth_accounts': return state.accounts;
          case 'eth_chainId': return state.chainId;
          case 'wallet_switchEthereumChain':
            if (state.needsAddChain) throw error(4902, 'Unrecognized chain');
            emit('chainChanged', request.params[0].chainId); return null;
          case 'wallet_addEthereumChain': state.needsAddChain = false; return null;
          case 'eth_blockNumber': return '0xf';
          case 'eth_estimateGas': return '0x200000';
          case 'eth_gasPrice': return '0x3b9aca00';
          case 'eth_getTransactionCount': return '0x0';
          case 'eth_getTransactionByHash': return options.badTransactionLookup ? { hash } : transaction();
          case 'eth_getTransactionReceipt': return null;
          case 'eth_sendTransaction':
            state.sent.push(request.params[0]);
            if (state.rejectTransaction) throw error(4001, 'User rejected transaction');
            if (state.holdSignature) return new Promise((resolve, reject) => { approveSignature = () => resolve(hash); rejectSignature = () => reject(error(4001, 'User rejected transaction')); });
            return hash;
          default: throw error(-32601, `Unmocked wallet method: ${request.method}`);
        }
      },
    };
    window.ethereum = provider;
    window.__walletMock = { state, emit, approve: () => approveSignature?.(), reject: () => rejectSignature?.() };
  }, { options, account: ACCOUNT, target: TARGET_CHAIN, registry: REGISTRY, hash: TRANSACTION_HASH });
  return state;
}

export async function walletRequests(page, method) {
  return page.evaluate(name => window.__walletMock.state.requests.filter(request => request.method === name), method);
}

export async function openSubmission(page) {
  await page.getByRole('button', { name: 'Submit a project', exact: true }).first().click();
  await page.getByLabel('Project slug', { exact: false }).fill('probiuna-test-project');
  await page.getByLabel('Metadata link', { exact: false }).fill('ipfs://probiuna/test-project');
  return page.locator('.pb-dialog--submit');
}
