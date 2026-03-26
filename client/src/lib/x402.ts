import {
  X402_HEADERS,
  type X402PaymentPayload,
  type X402PaymentRequired,
  type X402PaymentRequirements,
} from '../../../shared/x402';
import {
  STACKS_NETWORK,
  SBTC_CONTRACT_ADDRESS,
  SBTC_CONTRACT_NAME,
  USDCX_CONTRACT_ADDRESS,
  USDCX_CONTRACT_NAME,
} from './constants';
import { getUserAddress } from './stacks';

function decodeBase64Json<T>(encoded: string): T | null {
  try {
    return JSON.parse(atob(encoded)) as T;
  } catch {
    return null;
  }
}

function encodeBase64Json(value: unknown) {
  return btoa(JSON.stringify(value));
}

function isX402PaymentRequired(value: unknown): value is X402PaymentRequired {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.x402Version === 2 && Array.isArray(candidate.accepts) && candidate.accepts.length > 0;
}

async function getWalletPublicKey() {
  const { request } = await import('@stacks/connect');
  const result = await request('stx_getAddresses') as {
    addresses?: Array<{
      address?: string;
      publicKey?: string;
      symbol?: string;
    }>;
  };

  const connectedAddress = getUserAddress();
  const addresses = result.addresses || [];
  const matchedEntry = connectedAddress
    ? addresses.find((entry) => entry.address === connectedAddress && entry.publicKey)
      || addresses.find((entry) => entry.symbol === 'STX' && entry.publicKey)
    : addresses.find((entry) => entry.symbol === 'STX' && entry.publicKey);

  if (!matchedEntry?.publicKey) {
    throw new Error('Could not get the connected wallet public key for x402 payment signing');
  }

  return matchedEntry.publicKey;
}

function resolveAssetContract(asset: string) {
  if (asset === 'STX') {
    return null;
  }

  const [contractAddress, contractName] = asset.split('.');
  if (contractAddress && contractName) {
    return { contractAddress, contractName };
  }

  const normalized = asset.toUpperCase();
  if (normalized === 'SBTC') {
    return { contractAddress: SBTC_CONTRACT_ADDRESS, contractName: SBTC_CONTRACT_NAME };
  }

  if (normalized === 'USDCX') {
    return { contractAddress: USDCX_CONTRACT_ADDRESS, contractName: USDCX_CONTRACT_NAME };
  }

  throw new Error(`Unsupported x402 asset: ${asset}`);
}

async function signAcceptedPayment(accepted: X402PaymentRequirements) {
  const {
    bufferCVFromString,
    makeUnsignedContractCall,
    makeUnsignedSTXTokenTransfer,
    noneCV,
    principalCV,
    someCV,
    uintCV,
  } = await import('@stacks/transactions');
  const senderAddress = getUserAddress();
  if (!senderAddress) {
    throw new Error('No connected wallet address found for x402 payment signing');
  }

  const publicKey = await getWalletPublicKey();
  const memo = `x402:${Date.now().toString(36)}`.slice(0, 34);

  if (accepted.asset === 'STX') {
    const transaction = await makeUnsignedSTXTokenTransfer({
      recipient: accepted.payTo,
      amount: BigInt(accepted.amount),
      publicKey,
      network: STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
      memo,
    });

    return transaction.serialize();
  }

  const contract = resolveAssetContract(accepted.asset);
  if (!contract) {
    throw new Error(`Unsupported x402 asset: ${accepted.asset}`);
  }

  const transaction = await makeUnsignedContractCall({
    contractAddress: contract.contractAddress,
    contractName: contract.contractName,
    functionName: 'transfer',
    functionArgs: [
      uintCV(BigInt(accepted.amount).toString()),
      principalCV(senderAddress),
      principalCV(accepted.payTo),
      memo ? someCV(bufferCVFromString(memo)) : noneCV(),
    ],
    publicKey,
    network: STACKS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
  });

  return transaction.serialize();
}

async function buildPaymentSignature(paymentRequired: X402PaymentRequired, accepted: X402PaymentRequirements) {
  const { request } = await import('@stacks/connect');
  const unsignedTransaction = await signAcceptedPayment(accepted);
  const signResult = await request('stx_signTransaction', {
    transaction: unsignedTransaction,
    broadcast: false,
  }) as { transaction?: string };

  if (!signResult.transaction) {
    throw new Error('Stacks wallet did not return a signed transaction for x402 payment');
  }

  const payload: X402PaymentPayload = {
    x402Version: 2,
    resource: paymentRequired.resource,
    accepted,
    payload: {
      transaction: signResult.transaction,
    },
  };

  return encodeBase64Json(payload);
}

async function parsePaymentRequiredResponse(response: Response) {
  const headerValue = response.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
  const fromHeader = headerValue ? decodeBase64Json<X402PaymentRequired>(headerValue) : null;
  if (fromHeader?.accepts?.length) {
    return fromHeader;
  }

  const body = await response.clone().json().catch(() => null);
  return isX402PaymentRequired(body) ? body : null;
}

export async function retryResponseWithX402Payment(response: Response, requestUrl: string, init: RequestInit) {
  const paymentRequired = await parsePaymentRequiredResponse(response);
  if (!paymentRequired) {
    return response;
  }

  const accepted = paymentRequired.accepts[0];
  if (!accepted) {
    throw new Error('No supported x402 payment options were returned by the server');
  }

  const paymentSignature = await buildPaymentSignature(paymentRequired, accepted);
  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set(X402_HEADERS.PAYMENT_SIGNATURE, paymentSignature);

  return fetch(requestUrl, {
    ...init,
    headers: retryHeaders,
    credentials: 'include',
  });
}
