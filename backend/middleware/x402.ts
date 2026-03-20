import type { NextFunction, Request, Response } from 'express';
import { TOKEN_TYPES } from '@shared/schema';

export type X402Options = {
  amount?: string;
  allowedTokens?: readonly (typeof TOKEN_TYPES)[number][];
  challenge?: string;
};

export function createX402Middleware(options: X402Options = {}) {
  const allowedTokens = options.allowedTokens || TOKEN_TYPES;
  const challenge = options.challenge || `x402 amount=${options.amount || '100000'} tokens=${allowedTokens.join(',')}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const payTokenHeader = req.headers['x-pay-token'];
    const payToken = normalizeX402Token(Array.isArray(payTokenHeader) ? payTokenHeader[0] : payTokenHeader);

    if (!payToken) {
      res.set('WWW-Authenticate', challenge);
      return res.status(402).json({ message: 'Payment required via x402' });
    }

    if (!allowedTokens.includes(payToken)) {
      res.set('WWW-Authenticate', challenge);
      return res.status(402).json({ message: `Unsupported x402 pay token: ${payToken}` });
    }

    res.locals.x402Paid = true;
    res.locals.x402Token = payToken;
    next();
  };
}

function normalizeX402Token(payTokenHeader?: string) {
  const payToken = payTokenHeader?.trim().toLowerCase();

  switch (payToken) {
    case 'stx':
      return 'STX';
    case 'sbtc':
      return 'sBTC';
    case 'usdcx':
      return 'USDCx';
    default:
      return undefined;
  }
}

export const x402Paywall = createX402Middleware();
export const x402 = x402Paywall;

export default x402Paywall;
