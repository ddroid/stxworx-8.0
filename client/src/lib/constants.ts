export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'STTCT2FCG2AE0T2Q70KBA1GDM4VN14FRW5A1NBR0';
export const CONTRACT_NAME = import.meta.env.VITE_ESCROW_CONTRACT_NAME || 'stxworks-escrow-v7';
export const VERIFY_SOULBOUND_CONTRACT_NAME = import.meta.env.VITE_VERIFY_SOULBOUND_CONTRACT_NAME || 'stxworx-verify-sip009';
export const REPUTATION_CONTRACT_NAME = import.meta.env.VITE_REPUTATION_CONTRACT_NAME || 'stxworx-rep-sip013';

export const SBTC_CONTRACT_ADDRESS = import.meta.env.VITE_SBTC_CONTRACT_ADDRESS || CONTRACT_ADDRESS;
export const SBTC_CONTRACT_NAME = import.meta.env.VITE_SBTC_CONTRACT_NAME || 'sbtc-token';
export const SBTC_ASSET_NAME = import.meta.env.VITE_SBTC_ASSET_NAME || SBTC_CONTRACT_NAME;

export const USDCX_CONTRACT_ADDRESS = import.meta.env.VITE_USDCX_CONTRACT_ADDRESS || CONTRACT_ADDRESS;
export const USDCX_CONTRACT_NAME = import.meta.env.VITE_USDCX_CONTRACT_NAME || 'usdcx-token';
export const USDCX_ASSET_NAME = import.meta.env.VITE_USDCX_ASSET_NAME || USDCX_CONTRACT_NAME;

export const HIRO_API_BASE_URL = import.meta.env.VITE_HIRO_API_BASE_URL || 'https://api.testnet.hiro.so';

export const STACKS_NETWORK = (import.meta.env.VITE_STACKS_NETWORK || 'testnet').toLowerCase();

export const APP_CONFIG = {
  name: 'STXWorx Freelance',
  icon: '/vite.svg',
};

export const IS_TESTNET = STACKS_NETWORK !== 'mainnet';
