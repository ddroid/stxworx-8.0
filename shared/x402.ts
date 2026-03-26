export type X402Network = `stacks:${string}`;

export const X402_HEADERS = {
  PAYMENT_REQUIRED: 'payment-required',
  PAYMENT_SIGNATURE: 'payment-signature',
  PAYMENT_RESPONSE: 'payment-response',
} as const;

export const STACKS_CAIP2_NETWORKS = {
  MAINNET: 'stacks:1' as X402Network,
  TESTNET: 'stacks:2147483648' as X402Network,
} as const;

export interface X402ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

export interface X402PaymentRequirements {
  scheme: string;
  network: X402Network;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface X402PaymentRequired {
  x402Version: 2;
  error?: string;
  resource: X402ResourceInfo;
  accepts: X402PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

export interface X402PaymentPayload {
  x402Version: 2;
  resource?: X402ResourceInfo;
  accepted: X402PaymentRequirements;
  payload: {
    transaction: string;
  };
  extensions?: Record<string, unknown>;
}

export interface X402SettlementResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: X402Network;
}

export function getStacksCaip2Network(network: string): X402Network {
  return network.toLowerCase() === 'mainnet'
    ? STACKS_CAIP2_NETWORKS.MAINNET
    : STACKS_CAIP2_NETWORKS.TESTNET;
}
