type EscrowTokenType = 'STX' | 'sBTC' | 'USDCx';

type HiroTransactionResponse = {
  tx_status?: string;
  tx_type?: string;
  sender_address?: string;
  contract_call?: {
    contract_id?: string;
    function_name?: string;
  };
  tx_result?: {
    repr?: string;
  };
};

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

function mapTxStatus(txStatus?: string) {
  const normalized = (txStatus || '').toLowerCase();

  if (normalized === 'success') {
    return 'confirmed' as const;
  }

  if (normalized.includes('pending')) {
    return 'pending' as const;
  }

  return 'failed' as const;
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
    const response = await fetch(`${getStacksApiBaseUrl()}/extended/v1/tx/${encodeURIComponent(input.txId)}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Stacks transaction ${input.txId}: ${response.status} ${response.statusText}`);
    }

    const transaction = await response.json() as HiroTransactionResponse;
    const status = mapTxStatus(transaction.tx_status);

    if (status !== 'confirmed') {
      return {
        status,
        onChainId: input.expectedOnChainId ?? null,
        error: transaction.tx_status ? `Escrow contract call status is ${transaction.tx_status}` : 'Escrow contract call is not yet confirmed',
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
