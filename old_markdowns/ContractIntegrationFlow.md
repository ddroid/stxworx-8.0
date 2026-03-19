# Escrow Contract Integration Flow

**Contract:** `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.escrow-contract-v1`
**Network:** Stacks Testnet

---

## Lifecycle Overview

```
CLIENT                              FREELANCER                         ADMIN
──────                              ──────────                         ─────
1. create-project-stx/sbtc
   (locks funds in escrow)
                                    2. complete-milestone
                                       (marks work done)
3. release-milestone-stx/sbtc
   (pays freelancer)
                                    4. Repeat steps 2-3 for
                                       each milestone

── Alternative paths ──
Either party: file-dispute       →  Admin: admin-resolve-dispute-stx/sbtc
Client: request-full-refund-stx     (no activity only)
Client: emergency-refund-stx        (after 144 blocks)
                                                                       admin-force-release-stx (after 144 blocks)
                                                                       admin-force-refund-stx (after 1008 blocks)
```

---

## Shared Setup

```typescript
import { openContractCall } from '@stacks/connect';
import { STACKS_TESTNET } from '@stacks/network';
import {
  uintCV,
  standardPrincipalCV,
  contractPrincipalCV,
  boolCV,
  PostConditionMode,
  callReadOnlyFunction,
  cvToJSON,
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87';
const CONTRACT_NAME = 'escrow-contract-v1';
const NETWORK = STACKS_TESTNET;

// sBTC trait reference (for sBTC project calls)
const SBTC_ADDRESS = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const SBTC_NAME = 'sbtc-token';
```

---

## Step 1: Client Creates Project (Locks Funds)

**Who:** Client
**When:** Client clicks "Assign" to lock funds with a freelancer
**Contract function:** `create-project-stx` or `create-project-sbtc`

```typescript
// STX: 6 decimals (1 STX = 1_000_000 µSTX)
// sBTC: 8 decimals (1 sBTC = 100_000_000 sats)

async function createProject(
  freelancerAddress: string,
  milestoneAmounts: number[], // [m1, m2, m3, m4] in token units (e.g. 0.5 STX)
  tokenType: 'STX' | 'sBTC',
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const decimals = tokenType === 'STX' ? 1_000_000 : 100_000_000;
  const toMicro = (amount: number) => Math.floor(amount * decimals);

  const m1 = milestoneAmounts[0] ? toMicro(milestoneAmounts[0]) : 0;
  const m2 = milestoneAmounts[1] ? toMicro(milestoneAmounts[1]) : 0;
  const m3 = milestoneAmounts[2] ? toMicro(milestoneAmounts[2]) : 0;
  const m4 = milestoneAmounts[3] ? toMicro(milestoneAmounts[3]) : 0;

  const functionArgs: any[] = [
    standardPrincipalCV(freelancerAddress),
    uintCV(m1),
    uintCV(m2),
    uintCV(m3),
    uintCV(m4),
  ];

  const functionName = tokenType === 'STX' ? 'create-project-stx' : 'create-project-sbtc';

  if (tokenType === 'sBTC') {
    functionArgs.push(contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME));
  }

  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

**What happens on-chain:**
- Client's full gross amount transfers into the contract
- 10% platform fee sent to treasury immediately
- NET amounts stored per milestone
- Returns new `project-id` (u1, u2, etc.)

**Read back for UI:**
```typescript
// Get the project data after TX confirms
const project = await callReadOnlyFunction({
  network: NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  contractName: CONTRACT_NAME,
  functionName: 'get-project',
  functionArgs: [uintCV(projectId)],
  senderAddress: CONTRACT_ADDRESS,
});
// Returns: { client, freelancer, total-amount, fee-paid, num-milestones, refunded, created-at, token-type }
```

---

## Step 2: Freelancer Completes a Milestone

**Who:** Freelancer
**When:** Freelancer clicks "Mark Complete" after finishing work
**Contract function:** `complete-milestone`

```typescript
async function completeMilestone(
  projectId: number,
  milestoneNum: number, // 1, 2, 3, or 4
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'complete-milestone',
    functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

**What happens on-chain:**
- Milestone `complete` flag set to `true`
- `completed-at` set to current burn block height
- No funds move

**Read back for UI:**
```typescript
const milestone = await callReadOnlyFunction({
  network: NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  contractName: CONTRACT_NAME,
  functionName: 'get-milestone',
  functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
  senderAddress: CONTRACT_ADDRESS,
});
// Returns: { amount, complete, released, completed-at }
```

---

## Step 3: Client Releases Payment

**Who:** Client
**When:** Client clicks "Approve & Release" after reviewing the milestone
**Contract function:** `release-milestone-stx` or `release-milestone-sbtc`

```typescript
async function releaseMilestone(
  projectId: number,
  milestoneNum: number,
  tokenType: 'STX' | 'sBTC',
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionName = tokenType === 'STX' ? 'release-milestone-stx' : 'release-milestone-sbtc';
  const functionArgs: any[] = [uintCV(projectId), uintCV(milestoneNum)];

  if (tokenType === 'sBTC') {
    functionArgs.push(contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME));
  }

  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

**What happens on-chain:**
- NET milestone amount transferred from contract to freelancer
- Milestone `released` flag set to `true`
- Auto-closes any open dispute on this milestone (in favor of freelancer)

---

## Step 4: Repeat Until All Milestones Released

Repeat steps 2-3 for milestones 2, 3, 4 (if they exist).

**Check project completion status:**
```typescript
const summary = await callReadOnlyFunction({
  network: NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  contractName: CONTRACT_NAME,
  functionName: 'get-project-status-summary',
  functionArgs: [uintCV(projectId)],
  senderAddress: CONTRACT_ADDRESS,
});
// Returns: {
//   milestones-complete, milestones-released, total-amount, fee-paid,
//   released-amount, refundable-amount, refunded, age-blocks,
//   last-activity-block, token-type
// }
// Project is DONE when: milestones-released == num-milestones && refundable-amount == 0
```

---

## Alternative Path A: File Dispute

**Who:** Client OR Freelancer
**When:** Disagreement on milestone quality or delivery

```typescript
async function fileDispute(
  projectId: number,
  milestoneNum: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'file-dispute',
    functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

**Effects:**
- Blocks `complete-milestone` on that milestone
- Blocks `request-full-refund-stx` and `emergency-refund-stx`
- Only admin can resolve via `admin-resolve-dispute-stx/sbtc`

**Read dispute status:**
```typescript
const dispute = await callReadOnlyFunction({
  network: NETWORK,
  contractAddress: CONTRACT_ADDRESS,
  contractName: CONTRACT_NAME,
  functionName: 'get-dispute',
  functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
  senderAddress: CONTRACT_ADDRESS,
});
// Returns: { filed-by, status (u1=open, u2=resolved), resolved-in-favor-of, filed-at, resolved-at }
```

---

## Alternative Path B: Client Requests Full Refund

**Who:** Client
**When:** No milestone has been completed or released, no open disputes

```typescript
async function requestFullRefund(
  projectId: number,
  tokenType: 'STX' | 'sBTC',
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionName = tokenType === 'STX' ? 'request-full-refund-stx' : 'request-full-refund-sbtc';
  const functionArgs: any[] = [uintCV(projectId)];

  if (tokenType === 'sBTC') {
    functionArgs.push(contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME));
  }

  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

**Returns:** Full NET escrow amount back to client. Marks project as refunded.

---

## Alternative Path C: Client Emergency Refund

**Who:** Client
**When:** After 144 burn blocks (~24 hours) from project creation, no open disputes

```typescript
async function emergencyRefund(
  projectId: number,
  tokenType: 'STX' | 'sBTC',
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  const functionName = tokenType === 'STX' ? 'emergency-refund-stx' : 'emergency-refund-sbtc';
  const functionArgs: any[] = [uintCV(projectId)];

  if (tokenType === 'sBTC') {
    functionArgs.push(contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME));
  }

  await openContractCall({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

**Returns:** (total-amount - already-released) back to client. Allows partial refund after some milestones were paid.

---

## Read-Only Helpers for UI State

```typescript
async function readContract(functionName: string, args: any[]) {
  const result = await callReadOnlyFunction({
    network: NETWORK,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs: args,
    senderAddress: CONTRACT_ADDRESS,
  });
  return cvToJSON(result);
}

// Usage:
const project     = await readContract('get-project', [uintCV(1)]);
const milestone   = await readContract('get-milestone', [uintCV(1), uintCV(1)]);
const summary     = await readContract('get-project-status-summary', [uintCV(1)]);
const dispute     = await readContract('get-dispute', [uintCV(1), uintCV(1)]);
const refundable  = await readContract('get-refundable', [uintCV(1)]);
const balance     = await readContract('get-contract-balance-stx', []);
const projectCount = await readContract('get-project-count', []);
```

---

## UI Button → Contract Function Map

| Button | Who sees it | Contract call | Condition to show |
|--------|-------------|---------------|-------------------|
| Assign / Create Escrow | Client | `create-project-stx` / `sbtc` | Project exists off-chain, freelancer selected |
| Mark Complete | Freelancer | `complete-milestone` | `milestone.complete == false` and no open dispute |
| Approve & Release | Client | `release-milestone-stx` / `sbtc` | `milestone.complete == true` and `milestone.released == false` |
| File Dispute | Client or Freelancer | `file-dispute` | `milestone.released == false` and no existing dispute |
| Request Full Refund | Client | `request-full-refund-stx` / `sbtc` | No milestone complete/released, no open disputes |
| Emergency Refund | Client | `emergency-refund-stx` / `sbtc` | 144+ blocks since creation, no open disputes |

---

## Error Codes Reference

| Code | Constant | Meaning |
|------|----------|---------|
| u100 | ERR-NOT-CLIENT | Caller is not the project client |
| u101 | ERR-NOT-FREELANCER | Caller is not the project freelancer |
| u102 | ERR-PROJECT-NOT-FOUND | Invalid project ID |
| u103 | ERR-INVALID-MILESTONE | Invalid milestone number |
| u105 | ERR-NOT-COMPLETE | Milestone not marked complete yet |
| u106 | ERR-ALREADY-RELEASED | Milestone already paid out |
| u108 | ERR-INVALID-AMOUNT | Zero or invalid amount |
| u111 | ERR-REFUND-NOT-ALLOWED | Refund conditions not met |
| u112 | ERR-ALREADY-REFUNDED | Project already refunded |
| u113 | ERR-NOT-OWNER | Caller is not contract owner |
| u114 | ERR-TOO-MANY-MILESTONES | More than 4 milestones or 0 milestones |
| u116 | ERR-ALREADY-COMPLETE | Milestone already marked complete |
| u117 | ERR-INVALID-TOKEN | Wrong token type for this project |
| u119 | ERR-CONTRACT-PAUSED | Contract is paused |
| u126 | ERR-DISPUTE-ALREADY-OPEN | Dispute already exists on this milestone |
| u127 | ERR-NOT-PROJECT-PARTY | Caller is not client or freelancer |
| u128 | ERR-NO-OPEN-DISPUTE | No open dispute to resolve |
| u131 | ERR-DISPUTE-ACTIVE | Action blocked by active dispute |
