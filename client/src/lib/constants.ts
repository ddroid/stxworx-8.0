export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'SP37JRPTQ0KFMB3HAFVCCAWDQWHKRJCGBW1W19TJH';
export const CONTRACT_NAME = import.meta.env.VITE_ESCROW_CONTRACT_NAME || 'escrow-multi-token-v11';
export const VERIFY_SOULBOUND_CONTRACT_NAME = import.meta.env.VITE_VERIFY_SOULBOUND_CONTRACT_NAME || 'verify-soulbound';
export const REPUTATION_CONTRACT_NAME = import.meta.env.VITE_REPUTATION_CONTRACT_NAME || 'rep-sft';

export const SBTC_CONTRACT_ADDRESS = import.meta.env.VITE_SBTC_CONTRACT_ADDRESS || 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
export const SBTC_CONTRACT_NAME = import.meta.env.VITE_SBTC_CONTRACT_NAME || 'sbtc-token';
export const SBTC_ASSET_NAME = import.meta.env.VITE_SBTC_ASSET_NAME || SBTC_CONTRACT_NAME;

export const USDCX_CONTRACT_ADDRESS = import.meta.env.VITE_USDCX_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const USDCX_CONTRACT_NAME = import.meta.env.VITE_USDCX_CONTRACT_NAME || 'usdcx';
export const USDCX_ASSET_NAME = import.meta.env.VITE_USDCX_ASSET_NAME || USDCX_CONTRACT_NAME;

export const HIRO_API_BASE_URL = import.meta.env.VITE_HIRO_API_BASE_URL || 'https://api.hiro.so';

export const STACKS_NETWORK = (import.meta.env.VITE_STACKS_NETWORK || 'mainnet').toLowerCase();

function assertAddressMatchesNetwork(label: string, address: string) {
  const normalized = address.trim().toUpperCase();
  if (!normalized) {
    throw new Error(`${label} is not configured`);
  }

  if (STACKS_NETWORK === 'mainnet' && normalized.startsWith('ST')) {
    throw new Error(`${label} is using a testnet address (${address}) while VITE_STACKS_NETWORK is mainnet`);
  }

  if (STACKS_NETWORK !== 'mainnet' && (normalized.startsWith('SP') || normalized.startsWith('SM'))) {
    throw new Error(`${label} is using a mainnet address (${address}) while VITE_STACKS_NETWORK is ${STACKS_NETWORK}`);
  }
}

assertAddressMatchesNetwork('VITE_CONTRACT_ADDRESS', CONTRACT_ADDRESS);

export const APP_CONFIG = {
  name: 'STXWorx Freelance',
  icon: '/vite.svg',
};

export const IS_TESTNET = STACKS_NETWORK !== 'mainnet';
