function getRequiredEnvValue(name: string) {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

export const STACKS_NETWORK = (import.meta.env.VITE_STACKS_NETWORK || 'mainnet').trim().toLowerCase();

export const CONTRACT_ADDRESS = getRequiredEnvValue('VITE_CONTRACT_ADDRESS');
export const CONTRACT_NAME = (import.meta.env.VITE_ESCROW_CONTRACT_NAME || 'escrow-v2').trim();
export const VERIFY_SOULBOUND_CONTRACT_NAME = (import.meta.env.VITE_VERIFY_SOULBOUND_CONTRACT_NAME || 'verify-soulbound').trim();
export const REPUTATION_CONTRACT_NAME = (import.meta.env.VITE_REPUTATION_CONTRACT_NAME || 'rep-sft').trim();

export const SBTC_CONTRACT_ADDRESS = getRequiredEnvValue('VITE_SBTC_CONTRACT_ADDRESS');
export const SBTC_CONTRACT_NAME = getRequiredEnvValue('VITE_SBTC_CONTRACT_NAME');
export const SBTC_ASSET_NAME = (import.meta.env.VITE_SBTC_ASSET_NAME || SBTC_CONTRACT_NAME).trim();

export const USDCX_CONTRACT_ADDRESS = getRequiredEnvValue('VITE_USDCX_CONTRACT_ADDRESS');
export const USDCX_CONTRACT_NAME = getRequiredEnvValue('VITE_USDCX_CONTRACT_NAME');
export const USDCX_ASSET_NAME = (import.meta.env.VITE_USDCX_ASSET_NAME || USDCX_CONTRACT_NAME).trim();

export const HIRO_API_BASE_URL = (import.meta.env.VITE_HIRO_API_BASE_URL || 'https://api.hiro.so').trim();

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
assertAddressMatchesNetwork('VITE_SBTC_CONTRACT_ADDRESS', SBTC_CONTRACT_ADDRESS);
assertAddressMatchesNetwork('VITE_USDCX_CONTRACT_ADDRESS', USDCX_CONTRACT_ADDRESS);

export const APP_CONFIG = {
  name: 'STXWorx Freelance',
  icon: '/vite.svg',
};

export const IS_TESTNET = STACKS_NETWORK !== 'mainnet';
