import { AppConfig, UserSession, authenticate as showConnectFn, request as stacksRequest } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import {
  APP_CONFIG,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  HIRO_API_BASE_URL,
  IS_TESTNET,
  REPUTATION_CONTRACT_NAME,
  SBTC_CONTRACT_ADDRESS,
  SBTC_CONTRACT_NAME,
  USDCX_CONTRACT_ADDRESS,
  USDCX_CONTRACT_NAME,
  VERIFY_SOULBOUND_CONTRACT_NAME,
} from './constants';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export const network = IS_TESTNET ? STACKS_TESTNET : STACKS_MAINNET;

export const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
export const verifySoulboundContractId = `${CONTRACT_ADDRESS}.${VERIFY_SOULBOUND_CONTRACT_NAME}`;
export const reputationContractId = `${CONTRACT_ADDRESS}.${REPUTATION_CONTRACT_NAME}`;
export const sbtcAssetContractId = `${SBTC_CONTRACT_ADDRESS}.${SBTC_CONTRACT_NAME}`;
export const usdcxAssetContractId = `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}`;

export function authenticate(onFinish?: (payload: any) => void) {
  showConnectFn({
    appDetails: {
      name: APP_CONFIG.name,
      icon: window.location.origin + APP_CONFIG.icon,
    },
    redirectTo: '/',
    onFinish: payload => {
      if (onFinish) {
        onFinish(payload);
      } else {
        window.location.reload();
      }
    },
    userSession,
  });
}

export function getUserData() {
  if (userSession.isUserSignedIn()) {
    return userSession.loadUserData();
  }
  return null;
}

export function getUserAddress() {
  const userData = getUserData();
  return IS_TESTNET
    ? userData?.profile?.stxAddress?.testnet || null
    : userData?.profile?.stxAddress?.mainnet || null;
}

export function signOut() {
  userSession.signUserOut();
  window.location.reload();
}

export async function requestSignMessage(message: string): Promise<{ signature: string; publicKey: string } | null> {
  try {
    const result = await stacksRequest('stx_signMessage', { message });
    return { signature: result.signature, publicKey: result.publicKey };
  } catch {
    return null;
  }
}

export async function getContractEvents(contract: string = contractId) {
  const response = await fetch(
    `${HIRO_API_BASE_URL}/extended/v1/contract/${encodeURIComponent(contract)}/events`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Hiro contract events for ${contract}`);
  }

  return response.json();
}
