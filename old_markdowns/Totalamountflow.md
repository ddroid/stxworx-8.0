# Platform Volume Aggregation Flow

**Source:** On-chain read-only calls to `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.escrow-multi-token-v4`

---

## Contract Functions Used

| Function | Returns |
|----------|---------|
| `get-project-count` | Total number of projects created (uint) |
| `get-project-status-summary(id)` | `{ total-amount, fee-paid, released-amount, refundable-amount, refunded, milestones-complete, milestones-released, token-type }` |

**Key:** `total-amount` is NET (fee already deducted). Gross volume = `total-amount + fee-paid`.

---

## Backend Endpoint

```
GET /api/platform/stats
```

### Logic

```typescript
import { callReadOnlyFunction, uintCV, cvToJSON } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

const CONTRACT_ADDRESS = 'STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87';
const CONTRACT_NAME = 'escrow-multi-token-v4';
const NETWORK = STACKS_TESTNET;

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

async function getPlatformStats() {
  const countResult = await readContract('get-project-count', []);
  const projectCount = countResult.value;

  const stats = {
    stx: { grossLocked: 0, netEscrowed: 0, released: 0, feesCollected: 0, active: 0, completed: 0, refunded: 0 },
    sbtc: { grossLocked: 0, netEscrowed: 0, released: 0, feesCollected: 0, active: 0, completed: 0, refunded: 0 },
  };

  for (let id = 1; id <= projectCount; id++) {
    const summary = await readContract('get-project-status-summary', [uintCV(id)]);
    const data = summary.value;

    const token = data['token-type'].value === '0' ? 'stx' : 'sbtc';
    const totalAmount = parseInt(data['total-amount'].value);
    const feePaid = parseInt(data['fee-paid'].value);
    const releasedAmount = parseInt(data['released-amount'].value);
    const isRefunded = data['refunded'].value;

    stats[token].grossLocked += totalAmount + feePaid;
    stats[token].netEscrowed += totalAmount;
    stats[token].released += releasedAmount;
    stats[token].feesCollected += feePaid;

    if (isRefunded) {
      stats[token].refunded += 1;
    } else if (data['refundable-amount'].value === '0' && releasedAmount > 0) {
      stats[token].completed += 1;
    } else {
      stats[token].active += 1;
    }
  }

  return {
    totalProjects: projectCount,
    stx: {
      ...stats.stx,
      grossLockedSTX: stats.stx.grossLocked / 1_000_000,
      releasedSTX: stats.stx.released / 1_000_000,
      feesSTX: stats.stx.feesCollected / 1_000_000,
    },
    sbtc: {
      ...stats.sbtc,
      grossLockedBTC: stats.sbtc.grossLocked / 100_000_000,
      releasedBTC: stats.sbtc.released / 100_000_000,
      feesBTC: stats.sbtc.feesCollected / 100_000_000,
    },
  };
}
```

### Response Shape

```json
{
  "totalProjects": 25,
  "stx": {
    "grossLocked": 50000000,
    "netEscrowed": 45000000,
    "released": 30000000,
    "feesCollected": 5000000,
    "active": 8,
    "completed": 15,
    "refunded": 2,
    "grossLockedSTX": 50,
    "releasedSTX": 30,
    "feesSTX": 5
  },
  "sbtc": {
    "grossLocked": 10000000,
    "netEscrowed": 9000000,
    "released": 5000000,
    "feesCollected": 1000000,
    "active": 3,
    "completed": 2,
    "refunded": 0,
    "grossLockedBTC": 0.1,
    "releasedBTC": 0.05,
    "feesBTC": 0.01
  }
}
```

---

## Performance Note

Each project requires one read-only call. For large project counts, cache the results:

- **Cache on backend** with a TTL (e.g. 5 minutes)
- **Incremental updates** — only re-fetch projects with IDs greater than your last cached count, plus any active projects that may have changed
- Read-only calls are free (no gas), but they still hit the Stacks node API
