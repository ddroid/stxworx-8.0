type EscrowTokenType = 'STX' | 'sBTC' | 'USDCx';

type HiroTransactionResponse = {
  tx_status?: string;
  tx_type?: string;
  sender_address?: string;
  block_height?: number;
  tx_index?: number;
  canonical?: boolean;
  contract_call?: {
    contract_id?: string;
    function_name?: string;
  };
  tx_result?: {
    repr?: string;
  };
};

type VerificationStatus = 'pending' | 'confirmed' | 'failed';

function normalizeAddress(address?: string | null) {
  return address?.trim().toUpperCase() || '';
}

function getExpectedFunctionName(tokenType: EscrowTokenType) {
  if (tokenType === 'sBTC') {
    return 'create-project-sbtc';
  }

  if (tokenType === 'USDCx') {
    return 'create-project-usdcx';
  }

  return 'create-project-stx';
}

function getExpectedContractId() {
  const contractAddress = (process.env.VITE_CONTRACT_ADDRESS || '').trim();
  const contractName = (process.env.VITE_ESCROW_CONTRACT_NAME || '').trim();

  if (!contractAddress || !contractName) {
    throw new Error('Escrow contract address and name must be configured before proposal acceptance can verify contract calls');
  }

  return `${contractAddress}.${contractName}`.toUpperCase();
}

function getStacksApiBaseUrl() {
  const configured = (process.env.STACKS_API_URL || process.env.VITE_HIRO_API_BASE_URL || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const network = (process.env.VITE_STACKS_NETWORK || 'testnet').toLowerCase();
  return network === 'mainnet' ? 'https://api.hiro.so' : 'https://api.testnet.hiro.so';
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getVerificationRetryConfig() {
  return {
    maxAttempts: readPositiveInteger(process.env.STACKS_TX_VERIFY_MAX_ATTEMPTS, 20),
    delayMs: readPositiveInteger(process.env.STACKS_TX_VERIFY_DELAY_MS, 3000),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAnchoredTransaction(transaction?: HiroTransactionResponse | null) {
  return Boolean(
    transaction &&
      typeof transaction.block_height === 'number' &&
      transaction.block_height > 0 &&
      typeof transaction.tx_index === 'number' &&
      transaction.tx_index >= 0 &&
      transaction.canonical !== false,
  );
}

function mapTxStatus(txStatus?: string, transaction?: HiroTransactionResponse | null) {
  const normalized = (txStatus || '').trim().toLowerCase();

  if (normalized === 'success') {
    return 'confirmed' as const;
  }

  if (
    normalized.startsWith('abort_') ||
    normalized.startsWith('pending_abort_') ||
    normalized.startsWith('dropped_') ||
    normalized.startsWith('replace_by_fee_') ||
    normalized.startsWith('replaced_') ||
    normalized === 'failed'
  ) {
    return 'failed' as const;
  }

  if (normalized === 'pending' && isAnchoredTransaction(transaction)) {
    return 'confirmed' as const;
  }

  if (
    normalized === '' ||
    normalized === 'pending' ||
    normalized === 'pending_microblock' ||
    normalized === 'pending_anchor_block'
  ) {
    return 'pending' as const;
  }

  return 'failed' as const;
}

async function fetchTransaction(txId: string) {
  const response = await fetch(`${getStacksApiBaseUrl()}/extended/v1/tx/${encodeURIComponent(txId)}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch Stacks transaction ${txId}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<HiroTransactionResponse>;
}

function extractOnChainId(txResultRepr?: string) {
  const match = txResultRepr?.match(/^\(ok u(\d+)\)$/);
  if (!match) {
    throw new Error('Escrow create-project transaction did not return an ok project id');
  }

  return Number.parseInt(match[1], 10);
}

export const stacksTransactionService = {
  async verifyEscrowCreateProjectTx(input: {
    txId: string;
    tokenType: EscrowTokenType;
    expectedSenderAddress: string;
    expectedOnChainId?: number | null;
  }) {
    const { maxAttempts, delayMs } = getVerificationRetryConfig();
    let transaction: HiroTransactionResponse | null = null;
    let status: VerificationStatus = 'pending';

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      transaction = await fetchTransaction(input.txId);
      status = mapTxStatus(transaction?.tx_status, transaction);

      if (status !== 'pending') {
        break;
      }

      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }

    if (!transaction) {
      return {
        status: 'pending' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: 'Escrow contract call has not been indexed by the Stacks API yet',
      };
    }

    if (status !== 'confirmed') {
      return {
        status,
        onChainId: input.expectedOnChainId ?? null,
        error: status === 'pending'
          ? (transaction.tx_status ? `Escrow contract call is still pending confirmation (${transaction.tx_status})` : 'Escrow contract call is not yet confirmed')
          : (transaction.tx_status ? `Escrow contract call status is ${transaction.tx_status}` : 'Escrow contract call failed before confirmation'),
      };
    }

    if (transaction.tx_type !== 'contract_call') {
      return {
        status: 'failed' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: 'Escrow payment transaction is not a contract call',
      };
    }

    if (normalizeAddress(transaction.sender_address) !== normalizeAddress(input.expectedSenderAddress)) {
      return {
        status: 'failed' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: 'Escrow contract call must be submitted by the authenticated client wallet',
      };
    }

    const expectedContractId = getExpectedContractId();
    if (normalizeAddress(transaction.contract_call?.contract_id) !== expectedContractId) {
      return {
        status: 'failed' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: 'Escrow contract call was sent to an unexpected contract',
      };
    }

    const expectedFunctionName = getExpectedFunctionName(input.tokenType);
    if (transaction.contract_call?.function_name !== expectedFunctionName) {
      return {
        status: 'failed' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: `Escrow contract call must invoke ${expectedFunctionName}`,
      };
    }

    const onChainId = extractOnChainId(transaction.tx_result?.repr);
    if (input.expectedOnChainId != null && onChainId !== input.expectedOnChainId) {
      return {
        status: 'failed' as const,
        onChainId,
        error: 'Escrow contract call returned a different on-chain project id than expected',
      };
    }

    return {
      status: 'confirmed' as const,
      onChainId,
      error: null,
    };
  },
};
