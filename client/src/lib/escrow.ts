import { openContractCall } from '@stacks/connect';
import {
  contractPrincipalCV,
  cvToJSON,
  fetchCallReadOnlyFunction,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions';
import type { ApiProject } from '../types/job';
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  SBTC_CONTRACT_ADDRESS,
  SBTC_CONTRACT_NAME,
  USDCX_CONTRACT_ADDRESS,
  USDCX_CONTRACT_NAME,
} from './constants';
import { network } from './stacks';

type EscrowTokenType = 'STX' | 'sBTC' | 'USDCx';

type ContractCallOptions = {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: any[];
  postConditionMode: PostConditionMode;
};

function isEscrowTokenType(tokenType: ApiProject['tokenType']): tokenType is EscrowTokenType {
  return tokenType === 'STX' || tokenType === 'sBTC' || tokenType === 'USDCx';
}

function toBaseUnits(amount: string | number | null | undefined, tokenType: EscrowTokenType) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  const multiplier = tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
  return Math.floor(numeric * multiplier);
}

function readUintValue(value: any) {
  const json = cvToJSON(value) as any;
  const raw = json?.value?.value ?? json?.value ?? 0;
  return Number(raw);
}

function contractCall(options: ContractCallOptions) {
  return new Promise<string>((resolve, reject) => {
    try {
      openContractCall({
        network,
        contractAddress: options.contractAddress,
        contractName: options.contractName,
        functionName: options.functionName,
        functionArgs: options.functionArgs,
        postConditionMode: options.postConditionMode,
        onFinish: (data: any) => {
          const txId = data?.txId || data?.txid;
          if (!txId) {
            reject(new Error('Stacks wallet did not return a transaction id'));
            return;
          }
          resolve(txId);
        },
        onCancel: () => {
          reject(new Error('Wallet transaction was cancelled'));
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function getNextProjectOnChainId() {
  const result = await fetchCallReadOnlyFunction({
    network,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-project-count',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
  });

  return readUintValue(result) + 1;
}

export async function createEscrowForProject(project: ApiProject, freelancerAddress: string) {
  if (!isEscrowTokenType(project.tokenType)) {
    throw new Error(`Unsupported token type for escrow contract: ${project.tokenType}`);
  }

  const onChainId = await getNextProjectOnChainId();
  const functionArgs: any[] = [
    standardPrincipalCV(freelancerAddress),
    uintCV(toBaseUnits(project.milestone1Amount, project.tokenType)),
    uintCV(toBaseUnits(project.milestone2Amount, project.tokenType)),
    uintCV(toBaseUnits(project.milestone3Amount, project.tokenType)),
    uintCV(toBaseUnits(project.milestone4Amount, project.tokenType)),
  ];

  let functionName = 'create-project-stx';
  if (project.tokenType === 'sBTC') {
    functionName = 'create-project-sbtc';
    functionArgs.push(contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME));
  } else if (project.tokenType === 'USDCx') {
    functionName = 'create-project-usdcx';
    functionArgs.push(contractPrincipalCV(USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME));
  }

  const txId = await contractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
  });

  return {
    onChainId,
    txId,
  };
}

export async function completeEscrowMilestone(projectOnChainId: number, milestoneNum: number) {
  return contractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'complete-milestone',
    functionArgs: [uintCV(projectOnChainId), uintCV(milestoneNum)],
    postConditionMode: PostConditionMode.Deny,
  });
}

export async function releaseEscrowMilestone(
  projectOnChainId: number,
  milestoneNum: number,
  tokenType: ApiProject['tokenType'],
) {
  if (!isEscrowTokenType(tokenType)) {
    throw new Error(`Unsupported token type for escrow contract: ${tokenType}`);
  }

  const functionArgs: any[] = [uintCV(projectOnChainId), uintCV(milestoneNum)];
  let functionName = 'release-milestone-stx';

  if (tokenType === 'sBTC') {
    functionName = 'release-milestone-sbtc';
    functionArgs.push(contractPrincipalCV(SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME));
  } else if (tokenType === 'USDCx') {
    functionName = 'release-milestone-usdcx';
    functionArgs.push(contractPrincipalCV(USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME));
  }

  return contractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
  });
}
