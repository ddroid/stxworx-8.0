# Admin Badge & Verification Contract Integration

**Contract:** `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.stxworx-v1`
**Network:** Stacks Testnet
**Who calls these:** Only the **admin wallet** (deployer) unless noted otherwise.

---

## Shared Setup

```typescript
import { openContractCall } from '@stacks/connect';
import { STACKS_TESTNET } from '@stacks/network';
import {
  uintCV,
  standardPrincipalCV,
  stringAsciiCV,
  boolCV,
  PostConditionMode,
  callReadOnlyFunction,
  cvToJSON,
} from '@stacks/transactions';

const BADGE_CONTRACT_ADDRESS = 'STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87';
const BADGE_CONTRACT_NAME = 'stxworx-v1';
const NETWORK = STACKS_TESTNET;
```

---

## Grade Tiers

| Constant | Value | Meaning |
|----------|-------|---------|
| `GRADE-BRONZE` | `u1` | Bronze tier |
| `GRADE-SILVER` | `u2` | Silver tier |
| `GRADE-GOLD` | `u3` | Gold tier |
| `GRADE-PLATINUM` | `u4` | Platinum tier |

---

## Admin Flow Overview

```
ADMIN
──────
1. admin-mint-grade       → Assign a grade badge to a user (one per user)
2. admin-upgrade-grade    → Upgrade user's grade (must be higher)
3. admin-revoke-grade     → Burn and remove a user's grade badge
4. admin-update-badge-cid → Update IPFS metadata on existing badge
5. mint-verified          → Mint verification badge 
Admin only
6. revoke-verified        → Revoke a verification badge (admin or backend)
7. set-paused             → Pause / unpause the entire contract
8. set-backend-address    → Change which address can mint verified badges
9. propose-admin          → Start admin transfer (two-step)
10. accept-admin          → New admin accepts the role
```

---

## 1. Mint Grade Badge

**Function:** `admin-mint-grade`
**Who:** Admin only
**Rule:** Each user can only have ONE grade badge. Will fail if user already has one.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `recipient` | `principal` | Stacks address of the user receiving the badge |
| 2 | `grade` | `uint` | Grade tier: `1` (Bronze), `2` (Silver), `3` (Gold), `4` (Platinum) |
| 3 | `ipfs-cid` | `string-ascii 64` | IPFS CID pointing to the badge metadata JSON (max 64 chars, cannot be empty) |

### Frontend Code

```typescript
async function adminMintGrade(
  recipientAddress: string,
  grade: number,       // 1 = Bronze, 2 = Silver, 3 = Gold, 4 = Platinum
  ipfsCid: string,     // e.g. "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'admin-mint-grade',
    functionArgs: [
      standardPrincipalCV(recipientAddress),
      uintCV(grade),
      stringAsciiCV(ipfsCid),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok uint)` — the new token ID (e.g. `u1`, `u2`, etc.)

### Errors
| Code | Meaning |
|------|---------|
| `u200` | Caller is not admin |
| `u204` | User already has a grade badge |
| `u206` | Invalid grade (not 1-4) or empty IPFS CID |
| `u210` | Contract is paused |

### On-chain Event
```
{ event: "grade-minted", token-id: uint, recipient: principal, grade: uint, ipfs-cid: string }
```

---

## 2. Upgrade Grade Badge

**Function:** `admin-upgrade-grade`
**Who:** Admin only
**Rule:** New grade MUST be strictly higher than the current grade. Burns old badge, mints new one.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `user` | `principal` | Stacks address of the user to upgrade |
| 2 | `new-grade` | `uint` | New grade tier (must be higher than current) |
| 3 | `ipfs-cid` | `string-ascii 64` | New IPFS CID for the upgraded badge metadata |

### Frontend Code

```typescript
async function adminUpgradeGrade(
  userAddress: string,
  newGrade: number,    // must be higher than current grade
  ipfsCid: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'admin-upgrade-grade',
    functionArgs: [
      standardPrincipalCV(userAddress),
      uintCV(newGrade),
      stringAsciiCV(ipfsCid),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok uint)` — the new token ID (old token is burned, new ID is incremented)

### Errors
| Code | Meaning |
|------|---------|
| `u200` | Caller is not admin |
| `u205` | User has no existing grade to upgrade |
| `u206` | Invalid grade (not 1-4) or empty IPFS CID |
| `u207` | New grade is not higher than current grade |
| `u210` | Contract is paused |

### On-chain Event
```
{ event: "grade-upgraded", token-id: uint, user: principal, old-grade: uint, new-grade: uint }
```

---

## 3. Revoke Grade Badge

**Function:** `admin-revoke-grade`
**Who:** Admin only
**What:** Burns the badge NFT completely and clears all map data. User can be re-minted a new badge after.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `user` | `principal` | Stacks address of the user whose badge to revoke |

### Frontend Code

```typescript
async function adminRevokeGrade(
  userAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'admin-revoke-grade',
    functionArgs: [
      standardPrincipalCV(userAddress),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok true)`

### Errors
| Code | Meaning |
|------|---------|
| `u200` | Caller is not admin |
| `u205` | User has no grade badge to revoke |
| `u210` | Contract is paused |

### On-chain Event
```
{ event: "grade-revoked", token-id: uint, user: principal }
```

---

## 4. Update Badge IPFS CID

**Function:** `admin-update-badge-cid`
**Who:** Admin only
**What:** Updates the IPFS metadata CID on an existing badge without burning/reminting. Use for artwork or metadata changes.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `token-id` | `uint` | The badge token ID to update |
| 2 | `new-cid` | `string-ascii 64` | New IPFS CID |

### Frontend Code

```typescript
async function adminUpdateBadgeCid(
  tokenId: number,
  newCid: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'admin-update-badge-cid',
    functionArgs: [
      uintCV(tokenId),
      stringAsciiCV(newCid),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok true)`

### Errors
| Code | Meaning |
|------|---------|
| `u200` | Caller is not admin |
| `u205` | Token ID does not exist |

### On-chain Event
```
{ event: "badge-cid-updated", token-id: uint, new-cid: string }
```

---

## 5. Mint Verified Badge

**Function:** `mint-verified`
**Who:** Backend address only (set by admin via `set-backend-address`)
**Rule:** One verification badge per user. Uses `contract-caller` not `tx-sender` for security.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `recipient` | `principal` | Stacks address of the user to verify |
| 2 | `ipfs-cid` | `string-ascii 64` | IPFS CID for verified badge metadata |

### Frontend Code

```typescript
async function mintVerified(
  recipientAddress: string,
  ipfsCid: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'mint-verified',
    functionArgs: [
      standardPrincipalCV(recipientAddress),
      stringAsciiCV(ipfsCid),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok uint)` — the new verified token ID

### Errors
| Code | Meaning |
|------|---------|
| `u201` | Caller is not the backend address |
| `u208` | User already has a verified badge |
| `u210` | Contract is paused |

### On-chain Event
```
{ event: "verified-minted", token-id: uint, recipient: principal, ipfs-cid: string }
```

---

## 6. Revoke Verified Badge

**Function:** `revoke-verified`
**Who:** Admin OR backend address

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `user` | `principal` | Stacks address of the user to un-verify |

### Frontend Code

```typescript
async function revokeVerified(
  userAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'revoke-verified',
    functionArgs: [
      standardPrincipalCV(userAddress),
    ],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok true)`

### Errors
| Code | Meaning |
|------|---------|
| `u202` | Caller is not admin or backend |
| `u209` | User has no verified badge |
| `u210` | Contract is paused |

### On-chain Event
```
{ event: "verified-revoked", token-id: uint, user: principal }
```

---

## 7. Pause / Unpause Contract

**Function:** `set-paused`
**Who:** Admin only
**What:** When paused, all mint/upgrade/revoke functions are blocked.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `paused` | `bool` | `true` to pause, `false` to unpause |

### Frontend Code

```typescript
async function setPaused(
  paused: boolean,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'set-paused',
    functionArgs: [boolCV(paused)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

---

## 8. Set Backend Address

**Function:** `set-backend-address`
**Who:** Admin only
**What:** Changes which wallet can call `mint-verified`.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `new-backend` | `principal` | New backend wallet address |

### Frontend Code

```typescript
async function setBackendAddress(
  newBackendAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'set-backend-address',
    functionArgs: [standardPrincipalCV(newBackendAddress)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

---

## 9. Transfer Admin (Two-Step)

### Step A: Propose New Admin

**Function:** `propose-admin`
**Who:** Current admin

```typescript
async function proposeAdmin(
  newAdminAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'propose-admin',
    functionArgs: [standardPrincipalCV(newAdminAddress)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Step B: Accept Admin

**Function:** `accept-admin`
**Who:** The proposed new admin (must match the pending proposal)

```typescript
async function acceptAdmin(
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'accept-admin',
    functionArgs: [],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Step C (Optional): Cancel Proposal

**Function:** `cancel-propose-admin`
**Who:** Current admin

```typescript
async function cancelProposeAdmin(
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName: 'cancel-propose-admin',
    functionArgs: [],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

---

## Read-Only Functions (No TX needed)

Use these to query state for the admin UI. They are free (no gas).

```typescript
async function readBadgeContract(functionName: string, args: any[]) {
  const result = await callReadOnlyFunction({
    network: NETWORK,
    contractAddress: BADGE_CONTRACT_ADDRESS,
    contractName: BADGE_CONTRACT_NAME,
    functionName,
    functionArgs: args,
    senderAddress: BADGE_CONTRACT_ADDRESS,
  });
  return cvToJSON(result);
}
```

### Available Queries

| Function | Args | Returns | Use case |
|----------|------|---------|----------|
| `get-user-grade` | `standardPrincipalCV(address)` | `{ token-id, grade }` or `none` | Check user's current grade before mint/upgrade |
| `has-minimum-grade` | `standardPrincipalCV(address), uintCV(minGrade)` | `true` / `false` | Gate features by grade tier |
| `is-user-verified` | `standardPrincipalCV(address)` | `true` / `false` | Show verified badge in UI |
| `get-user-profile` | `standardPrincipalCV(address)` | `{ grade, grade-token-id, is-verified, verified-token-id }` | Full profile for admin dashboard |
| `get-badge-info` | `uintCV(tokenId)` | `{ grade, owner, minted-at, ipfs-cid }` or `none` | Display badge details |
| `get-verified-info` | `uintCV(tokenId)` | `{ owner, minted-at, ipfs-cid }` or `none` | Display verified badge details |
| `get-token-uri` | `uintCV(tokenId)` | `(some "ipfs://Qm...")` or `none` | Get badge metadata URI |
| `get-verified-uri` | `uintCV(tokenId)` | `(some "ipfs://Qm...")` or `none` | Get verified metadata URI |
| `get-last-token-id` | none | `uint` | Total grade badges minted (nonce) |
| `get-last-verified-id` | none | `uint` | Total verified badges minted (nonce) |
| `get-owner` | `uintCV(tokenId)` | `(some principal)` or `none` | Check badge NFT owner |
| `get-verified-owner` | `uintCV(tokenId)` | `(some principal)` or `none` | Check verified NFT owner |

### Example: Check Before Minting

```typescript
// Before minting, check if user already has a grade
const existing = await readBadgeContract('get-user-grade', [
  standardPrincipalCV(recipientAddress)
]);

if (existing.value !== null) {
  // User already has a grade — show "Upgrade" button instead of "Mint"
  const currentGrade = existing.value.value.grade.value;
  console.log(`User has grade ${currentGrade}, use upgrade instead`);
} else {
  // User has no grade — show "Mint" button
}
```

### Example: Load User Profile for Admin Dashboard

```typescript
const profile = await readBadgeContract('get-user-profile', [
  standardPrincipalCV(userAddress)
]);

const data = profile.value;
// data.grade.value         → "1" | "2" | "3" | "4" | null
// data['grade-token-id']   → token ID or null
// data['is-verified'].value → true | false
// data['verified-token-id'] → token ID or null
```

---

## Admin UI Button Map

| Button | Contract Function | Show When |
|--------|-------------------|-----------|
| Mint Bronze/Silver/Gold/Platinum | `admin-mint-grade` | `get-user-grade` returns `none` |
| Upgrade Grade | `admin-upgrade-grade` | `get-user-grade` returns a grade AND new grade > current |
| Revoke Grade | `admin-revoke-grade` | `get-user-grade` returns a grade |
| Update Badge Metadata | `admin-update-badge-cid` | Badge exists (have token-id) |
| Verify User | `mint-verified` | `is-user-verified` returns `false` (backend wallet only) |
| Revoke Verification | `revoke-verified` | `is-user-verified` returns `true` |
| Pause Contract | `set-paused(true)` | Contract is not paused |
| Unpause Contract | `set-paused(false)` | Contract is paused |

---

## Error Codes Reference

| Code | Constant | Meaning |
|------|----------|---------|
| `u200` | `ERR-NOT-ADMIN` | Caller is not the contract admin |
| `u201` | `ERR-NOT-BACKEND` | Caller is not the backend address |
| `u202` | `ERR-NOT-AUTHORIZED` | Caller is not admin or backend |
| `u203` | `ERR-SOULBOUND` | NFT transfer blocked (badges are non-transferable) |
| `u204` | `ERR-ALREADY-HAS-GRADE` | User already has a grade badge (use upgrade instead) |
| `u205` | `ERR-NO-GRADE` | User has no grade badge / token ID not found |
| `u206` | `ERR-INVALID-GRADE` | Grade not 1-4, or IPFS CID is empty |
| `u207` | `ERR-GRADE-NOT-HIGHER` | New grade must be strictly higher than current |
| `u208` | `ERR-ALREADY-VERIFIED` | User already has a verified badge |
| `u209` | `ERR-NOT-VERIFIED` | User has no verified badge to revoke |
| `u210` | `ERR-CONTRACT-PAUSED` | Contract is paused by admin |
| `u211` | `ERR-SAME-ADMIN` | Cannot propose yourself as new admin |
| `u212` | `ERR-NO-PENDING-ADMIN` | No pending admin proposal to accept/cancel |

---

## IPFS CID Notes

- CIDs must be **ASCII-only** and **max 64 characters** (e.g. `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`)
- CIDs **cannot be empty** — the contract rejects zero-length strings
- The contract stores the raw CID. Read-only functions return `ipfs://{cid}` format
- Each badge tier should have its own metadata JSON pinned to IPFS with `name`, `description`, `image` fields
- Use `admin-update-badge-cid` to swap metadata without burning the NFT

### Metadata JSON Format (pinned to IPFS)

```json
{
  "name": "STXWorx Gold Badge",
  "description": "Gold-tier freelancer badge on STXWorx platform",
  "image": "ipfs://QmImageCID...",
  "attributes": [
    { "trait_type": "Grade", "value": "Gold" },
    { "trait_type": "Tier", "value": 3 }
  ]
}
```

---
---

# Admin Escrow Contract Integration

**Contract:** `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.escrow-contract-v1`
**Network:** Stacks Testnet
**Who calls these:** Only the **contract owner** (deployer) unless noted otherwise.

---

## Escrow Setup

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

const ESCROW_CONTRACT_ADDRESS = 'STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87';
const ESCROW_CONTRACT_NAME = 'escrow-contract-v1';
const NETWORK = STACKS_TESTNET;

// sBTC trait reference (for sBTC calls)
const SBTC_ADDRESS = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const SBTC_NAME = 'sbtc-token';
```

---

## Timeouts (Burn Blocks)

| Constant | Value | Approx Time | Used By |
|----------|-------|-------------|---------|
| `REFUND-TIMEOUT` | `u144` | ~24 hours | `emergency-refund-stx/sbtc` |
| `FORCE-RELEASE-TIMEOUT` | `u144` | ~24 hours | `admin-force-release-stx/sbtc` |
| `ABANDON-TIMEOUT` | `u1008` | ~7 days | `admin-force-refund-stx/sbtc` |

---

## Admin Flow Overview

```
ADMIN (Contract Owner)
──────────────────────
CONFIGURATION
  1. set-paused            → Pause / unpause the contract
  2. set-fee-rate          → Change platform fee (basis points, max 1000 = 10%)
  3. set-treasury          → Change where fees go
  4. set-sbtc-contract     → Change sBTC contract address
  5. propose-ownership     → Start owner transfer (two-step)
  6. accept-ownership      → New owner accepts

DISPUTE RESOLUTION
  7. admin-resolve-dispute-stx   → Resolve dispute: pay freelancer OR refund client
  8. admin-resolve-dispute-sbtc  → Same for sBTC projects

FORCE ACTIONS (time-locked)
  9. admin-force-release-stx     → Force-pay freelancer (after 144 blocks)
  10. admin-force-release-sbtc   → Same for sBTC projects
  11. admin-force-refund-stx     → Force-refund client (after 1008 blocks, abandoned)
  12. admin-force-refund-sbtc    → Same for sBTC projects

RECOVERY & PROTECTION
  13. admin-recover-sbtc         → Withdraw surplus sBTC (not committed to escrows)
  14. admin-reset-milestone      → Reset milestone to incomplete (redo work)
```

**Important:** Admin functions bypass the pause mechanism intentionally — so the admin can still resolve disputes and recover funds while the contract is paused.

---

## 1. Pause / Unpause Contract

**Function:** `set-paused`
**What:** Blocks all user actions (create project, complete milestone, release, refund). Admin actions still work.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `paused` | `bool` | `true` to pause, `false` to unpause |

### Frontend Code

```typescript
async function escrowSetPaused(
  paused: boolean,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'set-paused',
    functionArgs: [boolCV(paused)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u129` | Already in that state (no change) |

---

## 2. Set Fee Rate

**Function:** `set-fee-rate`
**What:** Change the platform fee percentage. Measured in basis points (1000 = 10%, 500 = 5%). Max is 1000.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `new-rate` | `uint` | Fee in basis points (e.g. `500` = 5%, `1000` = 10%) |

### Frontend Code

```typescript
async function setFeeRate(
  newRate: number,     // e.g. 500 for 5%
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'set-fee-rate',
    functionArgs: [uintCV(newRate)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u120` | Fee exceeds 10% max |
| `u129` | Same as current rate (no change) |

---

## 3. Set Treasury

**Function:** `set-treasury`
**What:** Change the wallet address where platform fees are sent on project creation.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `new` | `principal` | New treasury wallet address |

### Frontend Code

```typescript
async function setTreasury(
  newTreasuryAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'set-treasury',
    functionArgs: [standardPrincipalCV(newTreasuryAddress)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

---

## 4. Set sBTC Contract

**Function:** `set-sbtc-contract`
**What:** Change the registered sBTC token contract. Only works when no sBTC escrows are active.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `contract` | `principal` | New sBTC contract principal |

### Frontend Code

```typescript
async function setSbtcContract(
  sbtcContractAddress: string,
  sbtcContractName: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'set-sbtc-contract',
    functionArgs: [contractPrincipalCV(sbtcContractAddress, sbtcContractName)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u130` | Active sBTC escrows exist (can't change mid-escrow) |

---

## 5. Transfer Ownership (Two-Step)

### Step A: Propose New Owner

**Function:** `propose-ownership`

```typescript
async function proposeOwnership(
  newOwnerAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'propose-ownership',
    functionArgs: [standardPrincipalCV(newOwnerAddress)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Step B: Accept Ownership

**Function:** `accept-ownership`
**Who:** The proposed new owner

```typescript
async function acceptOwnership(
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'accept-ownership',
    functionArgs: [],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

---

## 6. Resolve Dispute (STX)

**Function:** `admin-resolve-dispute-stx`
**What:** Admin decides a disputed milestone — either release funds to freelancer OR refund to client.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `project-id` | `uint` | The project ID |
| 2 | `milestone-num` | `uint` | Which milestone (1-4) |
| 3 | `release-to-freelancer` | `bool` | `true` = pay freelancer, `false` = refund client |

### Frontend Code

```typescript
async function resolveDisputeStx(
  projectId: number,
  milestoneNum: number,
  releaseToFreelancer: boolean,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-resolve-dispute-stx',
    functionArgs: [
      uintCV(projectId),
      uintCV(milestoneNum),
      boolCV(releaseToFreelancer),
    ],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok uint)` — the amount transferred

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u102` | Project not found |
| `u103` | Invalid milestone number |
| `u128` | No open dispute on this milestone |
| `u106` | Milestone already released |
| `u112` | Project already refunded |
| `u117` | Wrong token type (use sbtc variant) |

---

## 7. Resolve Dispute (sBTC)

**Function:** `admin-resolve-dispute-sbtc`
**Same as above but for sBTC projects.** Adds the sBTC trait parameter.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `project-id` | `uint` | The project ID |
| 2 | `milestone-num` | `uint` | Which milestone (1-4) |
| 3 | `release-to-freelancer` | `bool` | `true` = pay freelancer, `false` = refund client |
| 4 | `sbtc-token` | `trait` | sBTC contract reference |

### Frontend Code

```typescript
async function resolveDisputeSbtc(
  projectId: number,
  milestoneNum: number,
  releaseToFreelancer: boolean,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-resolve-dispute-sbtc',
    functionArgs: [
      uintCV(projectId),
      uintCV(milestoneNum),
      boolCV(releaseToFreelancer),
      contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME),
    ],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

---

## 8. Force Release to Freelancer (STX)

**Function:** `admin-force-release-stx`
**What:** Force-pays freelancer for a completed milestone when the client won't approve. Requires 144 blocks (~24 hours) since milestone was marked complete.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `project-id` | `uint` | The project ID |
| 2 | `milestone-num` | `uint` | Which milestone (1-4) |

### Frontend Code

```typescript
async function forceReleaseStx(
  projectId: number,
  milestoneNum: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-force-release-stx',
    functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u105` | Milestone not marked complete yet |
| `u106` | Already released |
| `u125` | Too early (144 blocks haven't passed since completion) |

---

## 9. Force Release to Freelancer (sBTC)

**Function:** `admin-force-release-sbtc`
**Same as above for sBTC projects.**

```typescript
async function forceReleaseSbtc(
  projectId: number,
  milestoneNum: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-force-release-sbtc',
    functionArgs: [
      uintCV(projectId),
      uintCV(milestoneNum),
      contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME),
    ],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

---

## 10. Force Refund to Client (STX)

**Function:** `admin-force-refund-stx`
**What:** Force-refunds ALL unreleased funds to the client when a project is abandoned. Requires 1008 blocks (~7 days) since last activity. Closes all open disputes.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `project-id` | `uint` | The project ID |

### Frontend Code

```typescript
async function forceRefundStx(
  projectId: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-force-refund-stx',
    functionArgs: [uintCV(projectId)],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

### Returns
`(ok uint)` — the refund amount (total minus already released)

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u112` | Already refunded |
| `u108` | Nothing left to refund |
| `u122` | Project not abandoned yet (1008 blocks haven't passed) |

---

## 11. Force Refund to Client (sBTC)

**Function:** `admin-force-refund-sbtc`
**Same as above for sBTC projects.**

```typescript
async function forceRefundSbtc(
  projectId: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-force-refund-sbtc',
    functionArgs: [
      uintCV(projectId),
      contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME),
    ],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

---

## 12. Recover Surplus sBTC

**Function:** `admin-recover-sbtc`
**What:** Withdraw sBTC that was accidentally sent to the contract (not committed to any escrow). Only withdraws the surplus above `total-committed-sbtc`.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `amount` | `uint` | Amount to recover (must be <= surplus) |
| 2 | `recipient` | `principal` | Where to send the recovered sBTC |
| 3 | `sbtc-token` | `trait` | sBTC contract reference |

### Frontend Code

```typescript
async function recoverSbtc(
  amount: number,
  recipientAddress: string,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-recover-sbtc',
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(recipientAddress),
      contractPrincipalCV(SBTC_ADDRESS, SBTC_NAME),
    ],
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u123` | No surplus (balance equals committed amount) |

---

## 13. Reset Milestone

**Function:** `admin-reset-milestone`
**What:** Resets a milestone back to "incomplete" so the freelancer has to redo the work. Also clears any dispute on that milestone. Cannot reset if already released or refunded.

### Parameters

| # | Name | Type | Description |
|---|------|------|-------------|
| 1 | `project-id` | `uint` | The project ID |
| 2 | `milestone-num` | `uint` | Which milestone (1-4) |

### Frontend Code

```typescript
async function resetMilestone(
  projectId: number,
  milestoneNum: number,
  onFinish: (data: any) => void,
  onCancel: () => void
) {
  await openContractCall({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'admin-reset-milestone',
    functionArgs: [uintCV(projectId), uintCV(milestoneNum)],
    postConditionMode: PostConditionMode.Deny,
    onFinish,
    onCancel,
  });
}
```

### Errors
| Code | Meaning |
|------|---------|
| `u113` | Not contract owner |
| `u102` | Project not found |
| `u103` | Invalid milestone number |
| `u106` | Already released (can't undo payment) |
| `u112` | Project already refunded |

---

## Read-Only Functions for Admin Dashboard

```typescript
async function readEscrowContract(functionName: string, args: any[]) {
  const result = await callReadOnlyFunction({
    network: NETWORK,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName,
    functionArgs: args,
    senderAddress: ESCROW_CONTRACT_ADDRESS,
  });
  return cvToJSON(result);
}
```

### Available Queries

| Function | Args | Returns | Use case |
|----------|------|---------|----------|
| `get-project` | `uintCV(id)` | `{ client, freelancer, total-amount, fee-paid, num-milestones, refunded, created-at, token-type }` | Project details |
| `get-milestone` | `uintCV(projectId), uintCV(num)` | `{ amount, complete, released, completed-at }` | Milestone status |
| `get-project-count` | none | `uint` | Total projects created |
| `get-project-status-summary` | `uintCV(id)` | `{ milestones-complete, milestones-released, total-amount, fee-paid, released-amount, refundable-amount, refunded, age-blocks, last-activity-block, token-type }` | Full project overview |
| `get-dispute` | `uintCV(projectId), uintCV(num)` | `{ filed-by, status, resolved-in-favor-of, filed-at, resolved-at }` | Dispute details |
| `get-dispute-count` | none | `uint` | Total disputes filed |
| `get-refundable` | `uintCV(id)` | `uint` | How much can still be refunded |
| `get-contract-balance-stx` | none | `uint` | STX held by contract |
| `get-committed-sbtc` | none | `uint` | sBTC committed to escrows |
| `get-fee-rate` | none | `uint` | Current fee in basis points |
| `get-treasury` | none | `principal` | Current treasury address |
| `get-contract-owner` | none | `principal` | Current owner |
| `get-proposed-owner` | none | `optional principal` | Pending owner transfer |
| `is-paused` | none | `bool` | Contract pause status |
| `get-last-activity` | `uintCV(id)` | `uint` | Last activity block for project |

### Example: Load Project for Admin Review

```typescript
const summary = await readEscrowContract('get-project-status-summary', [uintCV(projectId)]);
const data = summary.value.value;

// data['milestones-complete'].value  → "2"
// data['milestones-released'].value  → "1"
// data['total-amount'].value         → "5000000" (in micro-units)
// data['refundable-amount'].value    → "2500000"
// data['refunded'].value             → false
// data['age-blocks'].value           → "200"
// data['token-type'].value           → "0" (STX) or "1" (sBTC)
```

### Example: Check Dispute Before Resolving

```typescript
const dispute = await readEscrowContract('get-dispute', [uintCV(projectId), uintCV(milestoneNum)]);

if (dispute.value) {
  const d = dispute.value.value;
  // d['status'].value === "1" means OPEN (can resolve)
  // d['status'].value === "2" means RESOLVED (already handled)
  // d['filed-by']     → who filed the dispute
  // d['filed-at']     → when it was filed (burn block)
}
```

---

## Admin UI Button Map (Escrow)

| Button | Contract Function | Show When |
|--------|-------------------|-----------|
| Resolve Dispute (pay freelancer) | `admin-resolve-dispute-stx/sbtc` | Dispute status = OPEN (`u1`) |
| Resolve Dispute (refund client) | `admin-resolve-dispute-stx/sbtc` | Dispute status = OPEN (`u1`) |
| Force Release | `admin-force-release-stx/sbtc` | Milestone complete, not released, 144+ blocks since completion |
| Force Refund | `admin-force-refund-stx/sbtc` | Project not refunded, 1008+ blocks since last activity |
| Reset Milestone | `admin-reset-milestone` | Milestone complete but not released, not refunded |
| Pause Contract | `set-paused(true)` | Not paused |
| Unpause Contract | `set-paused(false)` | Paused |
| Change Fee | `set-fee-rate` | Any time |
| Change Treasury | `set-treasury` | Any time |
| Recover sBTC | `admin-recover-sbtc` | sBTC balance > committed amount |

---

## Escrow Error Codes Reference

| Code | Constant | Meaning |
|------|----------|---------|
| `u100` | `ERR-NOT-CLIENT` | Caller is not the project client |
| `u101` | `ERR-NOT-FREELANCER` | Caller is not the project freelancer |
| `u102` | `ERR-PROJECT-NOT-FOUND` | Invalid project ID |
| `u103` | `ERR-INVALID-MILESTONE` | Invalid milestone number |
| `u105` | `ERR-NOT-COMPLETE` | Milestone not marked complete yet |
| `u106` | `ERR-ALREADY-RELEASED` | Milestone already paid out |
| `u108` | `ERR-INVALID-AMOUNT` | Zero or invalid amount |
| `u111` | `ERR-REFUND-NOT-ALLOWED` | Refund conditions not met |
| `u112` | `ERR-ALREADY-REFUNDED` | Project already refunded |
| `u113` | `ERR-NOT-OWNER` | Caller is not contract owner |
| `u114` | `ERR-TOO-MANY-MILESTONES` | More than 4 milestones |
| `u116` | `ERR-ALREADY-COMPLETE` | Milestone already marked complete |
| `u117` | `ERR-INVALID-TOKEN` | Wrong token type for this project |
| `u118` | `ERR-INSUFFICIENT-BALANCE` | Not enough balance |
| `u119` | `ERR-CONTRACT-PAUSED` | Contract is paused |
| `u120` | `ERR-FEE-TOO-HIGH` | Fee exceeds 10% max |
| `u122` | `ERR-PROJECT-NOT-ABANDONED` | 1008 blocks haven't passed |
| `u123` | `ERR-NO-SURPLUS` | No surplus sBTC to recover |
| `u125` | `ERR-FORCE-RELEASE-TOO-EARLY` | 144 blocks haven't passed since completion |
| `u126` | `ERR-DISPUTE-ALREADY-OPEN` | Dispute already exists on milestone |
| `u127` | `ERR-NOT-PROJECT-PARTY` | Caller is not client or freelancer |
| `u128` | `ERR-NO-OPEN-DISPUTE` | No open dispute to resolve |
| `u129` | `ERR-NO-CHANGE` | Value is already the same |
| `u130` | `ERR-ACTIVE-ESCROWS` | Active sBTC escrows prevent change |
| `u131` | `ERR-DISPUTE-ACTIVE` | Action blocked by active dispute |
