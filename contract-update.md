You are working in the STXWORX codebase, a Stacks-based freelance marketplace that currently uses contracts/escrow-multi-token-v11.clar as the active escrow contract and supports `STX`, `sBTC`, and `USDCx`.

Your task is to implement a full **refund workflow** across the smart contract, backend, and frontend, while keeping the system **non-custodial** and **simple**.

## Core product decisions

Implement the following architecture exactly:

- The **escrow contract must hold the project funds**.
- Do **not** add token swap, auto-conversion, routing, DEX integration, or any “swap” abstraction.
- `STX`, `sBTC`, and `USDCx` remain separate payment assets.
- Refunds apply only to the **remaining unreleased escrowed amount**.
- Already released milestone payouts are final and must not be clawed back.
- Add a **fallback refund system**:
  - normal path = refund request + counterparty approval
  - fallback path = admin dispute refund
- The admin fallback must be **narrowly scoped**:
  - can only refund remaining unreleased funds
  - can only refund to the original client
  - can never send funds to arbitrary addresses
  - can never withdraw funds to itself
- Do not introduce backend custody.
- Do not add token swap.

## Desired user flow

Implement this refund UX and logic:

### Mutual refund path
1. Client funds escrow as usual.
2. If refund is needed, the **client can request a refund** from the project UI.
3. The freelancer can see the pending request and **approve the refund**.
4. Once approved, the contract refunds the **remaining escrowed balance** to the original client.
5. Project status updates to refunded / canceled as appropriate.

### Admin fallback path
1. If the parties do not cooperate or a dispute occurs, an **admin** can execute a fallback refund.
2. The admin fallback can only return the **remaining unreleased amount** to the client.
3. Admin refund must be transparent, logged, and status-tracked.
4. Admin cannot override released payouts.

## Security requirements

Implement with these rules:

- Keep the contract as the asset holder.
- Maintain strict project ownership and role checks.
- Never rely on the backend to move funds.
- Frontend should only initiate wallet transactions and call backend APIs for metadata/state sync.
- Backend should verify chain transactions and maintain off-chain status, but not custody funds.
- Reject arbitrary token substitution for `sBTC` and `USDCx`.
- Do not let the frontend supply a fake asset contract while labeling it as `sBTC` or `USDCx`.
- Add or strengthen canonical token validation for supported assets.
- No token swap feature anywhere.

## Existing repo context

Relevant files include:

- contracts/escrow-multi-token-v11.clar
- client/src/lib/constants.ts
- client/src/lib/escrow.ts
- backend/services/stacks-transaction.service.ts

And a new file contracts/escrow-v2.clar that will be the updated version of the contract.

You should inspect the actual codebase and update all affected files accordingly.

## Smart contract changes

Update contracts/escrow-multi-token-v11.clar inside contracts/escrow-v2.clar to support refunds safely.

### Contract goals
- Preserve existing escrow and milestone behavior where possible.
- Add refund state tracking.
- Add role-limited refund execution paths.
- Ensure refund amount is always derived from escrow state:
  - `remaining = total-funded - total-released`
- Support `STX`, `sBTC`, and `USDCx`.

### Required contract behavior
Implement a refund model that includes:

- project status tracking that distinguishes active / refunded / completed / cancelable states
- refund request tracking
- counterparty approval flow for mutual refund
- fallback admin refund path
- prevention of double refund
- prevention of refund after full completion
- prevention of refunding more than remaining balance
- refund only to the original client
- correct token-specific transfer behavior for `STX`, `sBTC`, and `USDCx`

### Suggested contract interface
You may adapt names if the existing contract structure strongly suggests a better naming scheme, but keep naming consistent and clear. Add functions equivalent to:

- `request-refund`
- `cancel-refund-request` or equivalent if needed
- `approve-refund`
- `execute-refund` or combined approval+refund flow
- `admin-refund`
- read-only getters for refund status / eligibility / remaining amount

If token-specific public functions are more appropriate due to the current contract design, keep that pattern consistent, e.g. token-specific refund execution functions.

### Admin model
Implement a configurable or explicitly defined refund admin model suitable for production, not a personal-wallet hack.

Preferred options:
- contract owner sets `refund-admin`
- or use a configurable admin principal
- design it so it can later be replaced by a multisig principal

Admin powers must remain narrowly scoped.

### Token safety
Very important:
- do not support token swaps
- do not add arbitrary new tokens
- do not allow fake `sBTC` / `USDCx` substitution
- use canonical or allowlisted token contracts per deployment/network
- keep `STX`, `sBTC`, `USDCx` as discrete supported assets only

### Contract events / observability
Add useful `print` events or equivalent observable outputs for:
- refund requested
- refund approved
- refund executed
- admin refund executed

## Backend changes

Update the backend so it fully supports refund lifecycle management.

### Backend goals
- expose refund-related APIs
- enforce role checks off-chain where appropriate
- persist refund state and history
- verify relevant chain transactions
- keep backend non-custodial

### Required backend work
Implement all necessary changes for:
- database schema/model updates for refund state
- API endpoints for:
  - request refund
  - fetch refund status
  - approve refund
  - admin refund action
- role-based authorization:
  - client can request refund
  - freelancer can approve mutual refund
  - admin can execute fallback refund
- project status synchronization after refund
- storing refund metadata:
  - requester
  - approver
  - admin actor if used
  - reason / note if useful
  - tx id
  - timestamps
  - status transitions

### Transaction verification
Strengthen on-chain verification logic in backend/services/stacks-transaction.service.ts and any related backend code.

Specifically:
- continue verifying escrow create-project transactions
- add verification for refund transactions if the app/backend tracks them
- verify that the correct contract and expected function were called
- where supported by available transaction decoding or API data, verify the expected asset contract/principal for `sBTC` and `USDCx`
- do not silently accept mislabeled token escrow/refund flows

If Hiro’s current response shape does not expose enough details directly, inspect the actual transaction payload or use the appropriate decoding approach rather than skipping validation.

### Admin config
Add backend config/env support for a refund admin principal if needed. Keep naming clear and do not introduce confusing mixed semantics.

## Frontend changes

Implement a clear refund UX in the frontend.

### Required UI behavior
On project or escrow-related screens:

- client sees a **Request Refund** button only when eligible
- freelancer sees an **Approve Refund** action when a refund request is pending
- admin sees a fallback refund action only in the right context
- users can see current refund state:
  - no request
  - pending approval
  - approved/executed
  - refunded
  - rejected/canceled if implemented

### UX requirements
- keep the flow simple and obvious
- disable buttons while transactions are pending
- show wallet confirmation guidance
- show success/error states cleanly
- do not expose admin controls to normal users
- do not add token swap UI
- keep token labels explicit: `STX`, `sBTC`, `USDCx`

### Frontend logic
Update the necessary frontend logic in:
- escrow-related library code
- project detail / proposal / payment UI
- API hooks and request helpers
- state refresh after tx confirmation

### Refund transaction flow
The frontend should:
- initiate the proper wallet transaction for refund execution when needed
- call backend APIs to persist/sync refund state
- show the resulting refund tx id and updated project state where appropriate

## Data model expectations

Update data structures as needed to support:
- refund status
- refund requested by
- refund approved by
- refund tx id
- refund admin actor
- refunded amount
- remaining amount
- timestamps
- project lifecycle state transitions

Keep the data model minimal and coherent. Do not introduce unnecessary complexity.

## Important architectural constraints

Do not implement any of the following:

- token swap
- token auto-conversion
- DEX integration
- backend-held funds
- arbitrary token support beyond `STX`, `sBTC`, `USDCx`
- a refund system that allows admin to seize user funds
- a refund system that can claw back already released milestone payouts

## Compatibility / migration expectations

Make your changes fit the existing codebase rather than rewriting the app from scratch.

- Preserve the existing escrow creation and milestone release flows unless changes are truly necessary.
- Keep naming/style consistent with the repo.
- Update all affected call sites.
- Update validation logic and env handling where needed.
- If current env examples contain incorrect token addresses for mainnet, correct them as part of the broader token-safety cleanup.
- Do not add token swap.

## Testing requirements

Add or update tests for:

### Contract tests
- request refund success
- approve + execute refund success
- admin fallback refund success
- refund blocked when no remaining balance
- refund blocked after completion
- unauthorized caller blocked
- double refund blocked
- correct handling for `STX`, `sBTC`, and `USDCx`

### Backend tests
- endpoint auth/role checks
- refund status transitions
- invalid actor rejection
- tx verification behavior
- project state sync after refund

### Frontend verification
- role-based button visibility
- pending/requested/refunded states
- successful action flow
- error handling

## Definition of done

The work is complete only when:

- the contract safely supports refund requests and fallback admin refunds
- the backend persists and verifies refund lifecycle data
- the frontend exposes a clean refund workflow with a visible `Request Refund` action
- the refund flow works for `STX`, `sBTC`, and `USDCx`
- the contract remains the asset holder
- refunds only affect unreleased escrowed funds
- no token swap functionality is introduced anywhere

## Output expectations

Please:
1. inspect the existing codebase first
2. implement the changes directly
3. explain key architectural choices briefly
4. list any migration/env changes required
5. call out any unresolved risk clearly
6. do not add token swap