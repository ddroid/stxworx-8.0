type EscrowTokenType = 'STX' | 'sBTC' | 'USDCx';
 type RefundKind = 'mutual' | 'admin';

 type HiroFunctionArg = {
   hex?: string;
   repr?: string;
   name?: string;
   type?: string;
 };

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
    function_args?: HiroFunctionArg[];
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

function getExpectedRefundFunctionName(tokenType: EscrowTokenType, refundKind: RefundKind) {
  if (refundKind === 'admin') {
    if (tokenType === 'sBTC') {
      return 'admin-refund-sbtc';
    }

    if (tokenType === 'USDCx') {
      return 'admin-refund-usdcx';
    }

    return 'admin-refund-stx';
  }

  if (tokenType === 'sBTC') {
    return 'approve-refund-sbtc';
  }

  if (tokenType === 'USDCx') {
    return 'approve-refund-usdcx';
  }

  return 'approve-refund-stx';
}

function getExpectedTokenContract(tokenType: Exclude<EscrowTokenType, 'STX'>) {
  const address = ((tokenType === 'sBTC' ? process.env.VITE_SBTC_CONTRACT_ADDRESS : process.env.VITE_USDCX_CONTRACT_ADDRESS) || '').trim();
  const name = ((tokenType === 'sBTC' ? process.env.VITE_SBTC_CONTRACT_NAME : process.env.VITE_USDCX_CONTRACT_NAME) || '').trim();

  if (!address || !name) {
    throw new Error(`${tokenType} contract address and name must be configured for escrow transaction verification`);
  }

  return `${address}.${name}`.toUpperCase();
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

function extractUintArgument(argument?: HiroFunctionArg | null) {
  const match = argument?.repr?.match(/^u(\d+)$/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function extractContractPrincipal(argument?: HiroFunctionArg | null) {
  const match = argument?.repr?.match(/([A-Z0-9]+\.[a-zA-Z0-9-_]+)/i);
  return match ? match[1].toUpperCase() : null;
}

function verifyExpectedTokenArgument(transaction: HiroTransactionResponse, tokenType: EscrowTokenType) {
  if (tokenType === 'STX') {
    return null;
  }

  const functionArgs = transaction.contract_call?.function_args || [];
  const tokenArgument = functionArgs[functionArgs.length - 1];
  const actualContract = extractContractPrincipal(tokenArgument);
  const expectedContract = getExpectedTokenContract(tokenType);

  if (!actualContract) {
    return 'Escrow contract call did not expose the expected token contract argument';
  }

  if (actualContract !== expectedContract) {
    return `Escrow contract call must use the configured ${tokenType} contract ${expectedContract}`;
  }

  return null;
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

    const tokenArgumentError = verifyExpectedTokenArgument(transaction, input.tokenType);
    if (tokenArgumentError) {
      return {
        status: 'failed' as const,
        onChainId: input.expectedOnChainId ?? null,
        error: tokenArgumentError,
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

  async verifyRefundTx(input: {
    txId: string;
    tokenType: EscrowTokenType;
    expectedSenderAddress: string;
    expectedOnChainId?: number | null;
    refundKind: RefundKind;
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
        error: 'Refund contract call has not been indexed by the Stacks API yet',
      };
    }

    if (status !== 'confirmed') {
      return {
        status,
        error: status === 'pending'
          ? (transaction.tx_status ? `Refund contract call is still pending confirmation (${transaction.tx_status})` : 'Refund contract call is not yet confirmed')
          : (transaction.tx_status ? `Refund contract call status is ${transaction.tx_status}` : 'Refund contract call failed before confirmation'),
      };
    }

    if (transaction.tx_type !== 'contract_call') {
      return {
        status: 'failed' as const,
        error: 'Refund transaction is not a contract call',
      };
    }

    if (normalizeAddress(transaction.sender_address) !== normalizeAddress(input.expectedSenderAddress)) {
      return {
        status: 'failed' as const,
        error: 'Refund contract call must be submitted by the expected wallet principal',
      };
    }

    const expectedContractId = getExpectedContractId();
    if (normalizeAddress(transaction.contract_call?.contract_id) !== expectedContractId) {
      return {
        status: 'failed' as const,
        error: 'Refund contract call was sent to an unexpected contract',
      };
    }

    const expectedFunctionName = getExpectedRefundFunctionName(input.tokenType, input.refundKind);
    if (transaction.contract_call?.function_name !== expectedFunctionName) {
      return {
        status: 'failed' as const,
        error: `Refund contract call must invoke ${expectedFunctionName}`,
      };
    }

    const tokenArgumentError = verifyExpectedTokenArgument(transaction, input.tokenType);
    if (tokenArgumentError) {
      return {
        status: 'failed' as const,
        error: tokenArgumentError,
      };
    }

    if (input.expectedOnChainId != null) {
      const actualOnChainId = extractUintArgument(transaction.contract_call?.function_args?.[0]);
      if (actualOnChainId == null) {
        return {
          status: 'failed' as const,
          error: 'Refund contract call did not expose the expected project id argument',
        };
      }

      if (actualOnChainId !== input.expectedOnChainId) {
        return {
          status: 'failed' as const,
          error: 'Refund contract call targeted a different on-chain project id than expected',
        };
      }
    }

    return {
      status: 'confirmed' as const,
      error: null,
    };
  },
};
