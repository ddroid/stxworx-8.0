const AMOUNT_SCALE = 8;
const PERCENT_SCALE = 2;
const AMOUNT_MULTIPLIER = 10 ** AMOUNT_SCALE;
const PERCENT_MULTIPLIER = 10 ** PERCENT_SCALE;

function normalizeInput(value: string | number | null | undefined) {
  return String(value ?? '0').trim();
}

function parseScaledInteger(value: string | number | null | undefined, scale: number) {
  const normalized = normalizeInput(value);
  if (!normalized) {
    return 0;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return Number.NaN;
  }

  return Math.round(numeric * 10 ** scale);
}

function formatScaledInteger(value: number, scale: number) {
  const formatted = (value / 10 ** scale)
    .toFixed(scale)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
  return formatted === '-0' ? '0' : formatted;
}

export function calculateProposalAcceptanceAmounts(
  proposedAmount: string | number | null | undefined,
  feePercentage: string | number | null | undefined,
) {
  const totalUnits = parseScaledInteger(proposedAmount, AMOUNT_SCALE);
  const feeBasisPoints = parseScaledInteger(feePercentage, PERCENT_SCALE);

  if (!Number.isFinite(totalUnits) || totalUnits <= 0) {
    throw new Error('Proposed amount must be greater than 0');
  }

  if (!Number.isFinite(feeBasisPoints) || feeBasisPoints < 0) {
    throw new Error('Fee percentage cannot be negative');
  }

  const platformFeeUnits = Math.floor((totalUnits * feeBasisPoints) / (100 * PERCENT_MULTIPLIER));
  const compensationUnits = totalUnits - platformFeeUnits;

  if (platformFeeUnits <= 0) {
    throw new Error('Platform fee must be greater than 0');
  }

  if (compensationUnits <= 0) {
    throw new Error('Client compensation must be greater than 0');
  }

  return {
    totalAmount: formatScaledInteger(totalUnits, AMOUNT_SCALE),
    platformFeeAmount: formatScaledInteger(platformFeeUnits, AMOUNT_SCALE),
    compensationAmount: formatScaledInteger(compensationUnits, AMOUNT_SCALE),
  };
}
