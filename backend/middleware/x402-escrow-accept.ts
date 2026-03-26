import type { NextFunction, Request, Response } from 'express';
import { projectService } from '../services/project.service';
import { proposalService } from '../services/proposal.service';
import { platformSettingsService } from '../services/platform-settings.service';
import {
  X402_HEADERS,
  getStacksCaip2Network,
  type X402PaymentPayload,
  type X402PaymentRequired,
  type X402PaymentRequirements,
  type X402SettlementResponse,
} from '@shared/x402';

const DEFAULT_SBTC_CONTRACT_ADDRESS = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const DEFAULT_SBTC_CONTRACT_NAME = 'sbtc-token';
const DEFAULT_USDCX_CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const DEFAULT_USDCX_CONTRACT_NAME = 'usdcx';
const DEFAULT_FACILITATOR_URL = 'https://facilitator.stacksx402.com';
const DEFAULT_TIMEOUT_MS = 60_000;

type EscrowAcceptanceReceipt = {
  userId: number;
  proposalId: number;
  payer: string;
  transaction: string;
  network: X402SettlementResponse['network'];
  expiresAt: number;
};

const escrowAcceptanceReceipts = new Map<string, EscrowAcceptanceReceipt>();

function getReceiptKey(userId: number, proposalId: number) {
  return `${userId}:${proposalId}`;
}

function getReceiptTtlMs(maxTimeoutSeconds: number) {
  const configuredSeconds = Number(process.env.X402_ESCROW_RECEIPT_TTL_SECONDS || 600);
  const fallbackSeconds = Number.isFinite(maxTimeoutSeconds) ? maxTimeoutSeconds : 60;
  return Math.max(1, configuredSeconds, fallbackSeconds) * 1000;
}

function storeEscrowAcceptanceReceipt(
  userId: number,
  proposalId: number,
  settlement: X402SettlementResponse,
  maxTimeoutSeconds: number,
) {
  if (!settlement.payer) {
    throw new Error('Settled x402 escrow payment is missing a payer address');
  }

  escrowAcceptanceReceipts.set(getReceiptKey(userId, proposalId), {
    userId,
    proposalId,
    payer: settlement.payer,
    transaction: settlement.transaction,
    network: settlement.network,
    expiresAt: Date.now() + getReceiptTtlMs(maxTimeoutSeconds),
  });
}

export function getEscrowAcceptanceReceipt(userId: number, proposalId: number) {
  const receipt = escrowAcceptanceReceipts.get(getReceiptKey(userId, proposalId));
  if (!receipt) {
    return null;
  }

  if (receipt.expiresAt <= Date.now()) {
    escrowAcceptanceReceipts.delete(getReceiptKey(userId, proposalId));
    return null;
  }

  return receipt;
}

export function clearEscrowAcceptanceReceipt(userId: number, proposalId: number) {
  escrowAcceptanceReceipts.delete(getReceiptKey(userId, proposalId));
}

function toAtomicUnits(amount: number, tokenType: 'STX' | 'sBTC' | 'USDCx') {
  const decimals = tokenType === 'sBTC' ? 8 : 6;
  return Math.floor(amount * 10 ** decimals);
}

function getEscrowAcceptAmount(
  proposalAmount: string,
  daoFeePercentage: string,
  tokenType: 'STX' | 'sBTC' | 'USDCx',
) {
  const proposalAmountNumber = Number(proposalAmount);
  const daoFeePercentageNumber = Number(daoFeePercentage);

  if (!Number.isFinite(proposalAmountNumber) || proposalAmountNumber <= 0) {
    throw new Error('Proposal amount must be a positive number to compute the x402 escrow fee');
  }

  if (!Number.isFinite(daoFeePercentageNumber) || daoFeePercentageNumber < 0) {
    throw new Error('DAO fee percentage must be configured before x402 escrow payments can be accepted');
  }

  const feeAmount = proposalAmountNumber * (daoFeePercentageNumber / 100);
  const atomicUnits = toAtomicUnits(feeAmount, tokenType);

  if (atomicUnits <= 0) {
    throw new Error('Computed x402 escrow fee must be greater than zero');
  }

  return atomicUnits.toString();
}

function getEscrowAcceptAsset(tokenType: 'STX' | 'sBTC' | 'USDCx') {
  if (tokenType === 'STX') {
    return 'STX';
  }

  if (tokenType === 'sBTC') {
    const address = process.env.VITE_SBTC_CONTRACT_ADDRESS || DEFAULT_SBTC_CONTRACT_ADDRESS;
    const name = process.env.VITE_SBTC_CONTRACT_NAME || DEFAULT_SBTC_CONTRACT_NAME;
    return `${address}.${name}`;
  }

  const address = process.env.VITE_USDCX_CONTRACT_ADDRESS || DEFAULT_USDCX_CONTRACT_ADDRESS;
  const name = process.env.VITE_USDCX_CONTRACT_NAME || DEFAULT_USDCX_CONTRACT_NAME;
  return `${address}.${name}`;
}

function getFacilitatorUrl() {
  return (process.env.X402_FACILITATOR_URL || process.env.FACILITATOR_URL || DEFAULT_FACILITATOR_URL).replace(/\/$/, '');
}

function encodeBase64Json(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

function decodePaymentPayload(headerValue: string): X402PaymentPayload | null {
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded) as X402PaymentPayload;
  } catch {
    return null;
  }
}

function getResourceUrl(req: Request) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

function buildPaymentRequired(req: Request, requirements: X402PaymentRequirements, error?: string): X402PaymentRequired {
  return {
    x402Version: 2,
    error,
    resource: {
      url: getResourceUrl(req),
      description: 'Accepting a freelancer proposal requires an x402 payment before escrow activation.',
      mimeType: 'application/json',
    },
    accepts: [requirements],
  };
}

function normalizeAddress(address?: string | null) {
  return address?.trim().toUpperCase() || '';
}

function requirementsMatch(expected: X402PaymentRequirements, actual?: X402PaymentRequirements | null) {
  if (!actual) {
    return false;
  }

  return expected.scheme === actual.scheme
    && expected.network === actual.network
    && expected.amount === actual.amount
    && expected.asset === actual.asset
    && expected.payTo === actual.payTo;
}

function sendPaymentRequired(req: Request, res: Response, requirements: X402PaymentRequirements, error?: string) {
  const paymentRequired = buildPaymentRequired(req, requirements, error);
  res.setHeader(X402_HEADERS.PAYMENT_REQUIRED, encodeBase64Json(paymentRequired));
  return res.status(402).json(paymentRequired);
}

async function settlePayment(paymentPayload: X402PaymentPayload, paymentRequirements: X402PaymentRequirements) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${getFacilitatorUrl()}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x402Version: 2,
        paymentPayload,
        paymentRequirements,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return data as X402SettlementResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function x402EscrowAcceptancePaywall(req: Request, res: Response, next: NextFunction) {
  try {
    const proposalId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(proposalId)) {
      return res.status(400).json({ message: 'Invalid proposal ID' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const proposal = await proposalService.getById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const project = await projectService.getById(proposal.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const platformConfig = await platformSettingsService.get();
    const payTo = (platformConfig.daoWalletAddress || process.env.X402_PAY_TO || process.env.SERVER_ADDRESS || '').trim();

    if (!payTo) {
      return res.status(500).json({ message: 'DAO wallet address must be configured before x402 escrow payments can be accepted' });
    }

    const paymentRequirements: X402PaymentRequirements = {
      scheme: 'exact',
      network: getStacksCaip2Network(process.env.VITE_STACKS_NETWORK || 'testnet'),
      amount: getEscrowAcceptAmount(proposal.proposedAmount, platformConfig.daoFeePercentage, project.tokenType),
      asset: getEscrowAcceptAsset(project.tokenType),
      payTo,
      maxTimeoutSeconds: Number(process.env.X402_MAX_TIMEOUT_SECONDS || 60),
      extra: {
        projectId: project.id,
        proposalId: proposal.id,
        tokenType: project.tokenType,
      },
    };

    const paymentHeaderValue = req.headers[X402_HEADERS.PAYMENT_SIGNATURE];
    const encodedPayload = Array.isArray(paymentHeaderValue) ? paymentHeaderValue[0] : paymentHeaderValue;

    if (!encodedPayload) {
      return sendPaymentRequired(req, res, paymentRequirements);
    }

    const paymentPayload = decodePaymentPayload(encodedPayload);
    if (!paymentPayload) {
      return res.status(400).json({ message: 'Invalid payment-signature header' });
    }

    if (paymentPayload.x402Version !== 2) {
      return res.status(400).json({ message: 'Only x402 version 2 payments are supported' });
    }

    if (!requirementsMatch(paymentRequirements, paymentPayload.accepted)) {
      return sendPaymentRequired(req, res, paymentRequirements, 'Payment requirements mismatch');
    }

    const settlement = await settlePayment(paymentPayload, paymentRequirements);

    if (!settlement.success) {
      return sendPaymentRequired(req, res, paymentRequirements, settlement.errorReason || 'Payment settlement failed');
    }

    if (normalizeAddress(settlement.payer) !== normalizeAddress(req.user.stxAddress)) {
      return sendPaymentRequired(req, res, paymentRequirements, 'Payment must be signed by the authenticated client wallet');
    }

    storeEscrowAcceptanceReceipt(req.user.id, proposal.id, settlement, paymentRequirements.maxTimeoutSeconds);

    res.locals.x402Payment = settlement;
    res.setHeader(X402_HEADERS.PAYMENT_RESPONSE, encodeBase64Json({
      success: settlement.success,
      payer: settlement.payer,
      transaction: settlement.transaction,
      network: settlement.network,
    }));

    next();
  } catch (error) {
    console.error('Escrow x402 paywall error:', error);
    return res.status(500).json({ message: error instanceof Error ? error.message : 'x402 escrow payment verification failed' });
  }
}
