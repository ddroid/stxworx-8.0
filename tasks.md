# STXWORX Task Backlog

## Product direction inferred from the codebase

The codebase and markdowns point to this as the intended product direction:

- A Stacks-based freelance marketplace with on-chain escrow for project funding and milestone payments.
- An off-chain coordination layer for auth, profiles, projects, proposals, milestones, disputes, reviews, settings, notifications, messaging, social posts, bounties, and admin tools.
- A reputation and identity layer built around profile quality, social presence, admin moderation, and NFT / soulbound badge concepts.
- AI used as a support/proposal-assistance feature, not as the core payment or protocol layer.

## Explicit product decision

- Keep a single escrow-first marketplace journey across backend, client, contracts, and documentation.
- Remove deprecated alternate payment concepts that conflict with proposal acceptance and escrow activation.
- Prefer one authoritative activation path: accept proposal, verify the escrow transaction, activate the project.

## Key audit findings

- The strongest implemented direction is still the escrow marketplace plus admin/social/reputation layers.
- Friend connections exist, but they are still a lightweight connection list rather than a full friend-request system.
- X/Twitter and email are mostly placeholder-level in settings.
- NFTs exist in schema, contracts, admin routes, profile reads, and UI assets, but the real mint/verification lifecycle still needs validation.
- AI integration exists in the frontend, but it needs functional and security verification.
- The top banner and surrounding product copy needed to be simplified around the escrow marketplace story.
- Documentation is inconsistent with the actual code in several places.

## Recently completed

### P0 - Escrow, milestones, and refund workflow

**Status:** Finished

**Completion summary**

- [x] Consolidated the marketplace around the canonical `escrow` contract.
- [x] Finalized support for `STX`, `sBTC`, and `USDCx` with explicit token allowlist configuration.
- [x] Removed unsafe default token principals and enforced explicit environment-based token configuration.
- [x] Ensured the escrow contract holds the full gross project amount until milestone release.
- [x] Moved fee collection to milestone release so refund math matches unreleased escrow balance.
- [x] Implemented refund request, cancel, approval, and admin fallback refund flows.
- [x] Added backend/frontend validation for network principals and escrow/refund transaction verification.
- [x] Aligned mainnet configuration for token contracts and the deployed escrow flow.

**Operational follow-up**

- [ ] Keep `.env.example`, `README.md`, and deployment docs aligned with the deployed `escrow` contract name.
- [ ] Re-run end-to-end smoke tests for STX, sBTC, USDCx, milestone release, mutual refund, and admin fallback refund after each related release.

## Priority backlog

### P0 - Product copy and launch messaging cleanup

**Detailed AI Prompt**

```text
Task:
- Remove product-facing copy that still feels like a beta experiment or points users toward outdated flows.
- Keep the marketplace story centered on wallet auth, proposals, escrow funding, milestones, and trust.

Not the task:
- Do not redesign the marketplace flow itself.
- Do not add new product features while doing copy cleanup.

Technical scope:
- Audit navbar/banner copy, landing copy, dashboard copy, and launch-related markdown files.
- Remove stale dates, outdated launch claims, and copy that conflicts with the escrow-first marketplace narrative.
- Make sure the same positioning appears consistently across client UI and docs.

Acceptance criteria:
- The top-level product story is consistent everywhere a user first encounters the platform.
- There are no obvious stale launch/beta messages left in core user-facing surfaces.

Verification:
- Review the navbar, landing surfaces, and top-level docs side by side after the cleanup.
```

- [ ] Remove the network status banner from the navbar announcement bar.
- [ ] Remove outdated launch/beta copy and stale dates from the top announcement content.
- [ ] Update repo documentation so the product description matches the actual direction: escrow marketplace + admin/social/reputation.

### P0 - Remove deprecated payment directions

**Detailed AI Prompt**

```text
Task:
- Move token selection and realtime token value handling out of the job application flow and into the job posting flow.
- Make the client's token choice authoritative so freelancers apply against the token and funding asset already chosen for the job.
- Remove deprecated alternate payment concepts that conflict with the escrow marketplace.
- Make escrow funding and on-chain verification the only supported payment direction.

Not the task:
- Do not introduce token swaps, custodial flows, or new payment abstractions.
- Do not let freelancers override the payment token during proposal/application submission.
- Do not preserve dead code just because it might be useful later.

Technical scope:
- Audit backend, client, shared modules, docs, and planning files for alternate-payment references and token-conversion-style UI.
- Move the token selection/realtime token value logic to the job posting/create-project flow so the client selects the payment asset before proposals are submitted.
- Update job creation, proposal submission, proposal review, and escrow activation data flow so the selected token originates from the job/project itself.
- Restrict freelancer applications so they inherit the token selected by the client instead of choosing or converting tokens at application time.
- Remove unused code paths, stale type branches, and docs that imply multiple competing payment models.
- Keep the minimum migration-safe compatibility only if something is still actively referenced.

Acceptance criteria:
- Clients choose the token during job posting/project creation.
- Freelancers can see the selected token when applying but cannot change it.
- Escrow funding and downstream contract verification use the token selected on the job/project.
- There is one canonical payment direction in code and docs.
- Deprecated alternate-payment paths are removed or clearly archived.

Verification:
- Search the repo for old payment terminology and application-time token conversion references and confirm only intentional references remain.
- Test job posting, proposal submission, proposal acceptance, and escrow funding to confirm the same client-selected token is used end to end.
```

- [ ] Move realtime token value selection/display from the job application flow to the job posting/project creation flow.
- [ ] Make the client-selected token the authoritative payment token stored on the job/project.
- [ ] Update freelancer application/proposal UX so the selected token is visible but not editable by the freelancer.
- [ ] Ensure proposal review and escrow activation consume the token selected during job posting.
- [ ] Remove legacy alternate-payment references from docs and planning files.
- [ ] Remove unused deprecated payment code paths from backend, client, and shared modules.
- [ ] Replace the legacy alternate-payment markdown with a neutral archival note or remove it.

### P0 - Canonical proposal activation flow

**Detailed AI Prompt**

```text
Task:
- Make the proposal acceptance path explicit and singular: client accepts proposal, escrow transaction is verified, project becomes active.
- Remove ambiguous progress states or legacy UI that suggests alternate activation routes.

Not the task:
- Do not redesign proposal UX beyond what is needed for correctness and clarity.
- Do not add new status models unless required to simplify and align the current flow.

Technical scope:
- Audit proposal acceptance UI, backend verification flow, project activation state updates, and related docs.
- Remove obsolete progress tracking if it no longer reflects the real activation model.
- Update labels, helper text, and docs to point to the escrow verification path as the source of truth.

Acceptance criteria:
- Proposal acceptance has one authoritative activation path.
- Project state changes and docs match the verified escrow flow.

Verification:
- Walk through a proposal acceptance scenario from client action to active project state and verify every surface matches the same sequence.
```

- [ ] Remove obsolete proposal acceptance progress tracking if it is no longer part of the intended flow.
- [ ] Reconfirm the single canonical proposal acceptance flow: client accepts proposal, escrow tx is verified, project becomes active.

### P0 - Roadmap decomposition for remaining features

**Detailed AI Prompt**

```text
Task:
- Turn the remaining backlog into execution-ready feature slices instead of broad umbrella asks.
- Split work into backend, frontend, schema, API, admin, and QA milestones whenever a task is too large for one pass.

Not the task:
- Do not try to implement multiple major features in one prompt.
- Do not mix planning work with unrelated production refactors.

Technical scope:
- Review each remaining feature area and identify dependencies, likely files, and rollout order.
- Break epics into smaller prompts that can be completed and reviewed independently.
- Keep each prompt grounded in the current Express + Drizzle + React + Stacks architecture.

Acceptance criteria:
- Large roadmap items are split into smaller, implementation-ready chunks.
- Each chunk has a clear boundary and definition of done.

Verification:
- A future AI pass should be able to pick a single section below and execute it without needing to reinterpret the entire backlog.
```

- [ ] Break each remaining feature into backend, frontend, schema, API, and QA sub-tasks before implementation.
- [ ] Define success criteria and dependencies for friend requests, identity connections, referrals, AI, NFTs, notifications, and docs.
- [ ] Keep each future implementation prompt narrowly scoped to one feature slice.

### P1 - Friend request system

**Detailed AI Prompt**

```text
Task:
- Replace the lightweight connections feature with a full friend-request lifecycle.
- Make relationship state explicit across backend, notifications, messaging permissions, and profile CTAs.

Not the task:
- Do not fake request state in the client.
- Do not reuse proposal notification types or unrelated tables for friend events.

Technical scope:
- Add or refactor schema for request state, acceptance state, cancellation, removal, and moderation-related restrictions.
- Update routes/services/controllers and notification creation logic.
- Render outgoing, incoming, accepted, blocked, and disconnected states from backend truth.

Acceptance criteria:
- Users can send, receive, accept, decline, cancel, remove, and restrict connections consistently.
- Messaging permissions respect the accepted-connection state when `connections_only` is enabled.

Verification:
- Test request, duplicate request, accept, decline, cancel, remove, and block/restrict scenarios end to end.
```

- [ ] Replace the current lightweight connections flow with a real friend-request lifecycle.
- [ ] Add dedicated notification types for connection/friend requests instead of reusing proposal-related notifications.
- [ ] Add outgoing request state in the UI.
- [ ] Add incoming request state in the UI.
- [ ] Add cancel pending request support.
- [ ] Add unfriend/remove connection support.
- [ ] Add block or restrict-user support for abuse prevention.
- [ ] Add mutual-friend or relevant suggestion logic if social growth is important.
- [ ] Add clear CTAs on profile pages for request sent / accept / decline / connected.
- [ ] Gate messaging rules consistently against accepted connections when `connections_only` is selected.
- [ ] Add tests for request, accept, decline, cancel, remove, and duplicate request scenarios.

### P1 - X and email connections

**Detailed AI Prompt**

```text
Task:
- Replace placeholder identity settings with real X OAuth and email verification flows.
- Persist connection status and verification state in the backend and render only backend-confirmed truth.

Not the task:
- Do not keep local-only connected toggles.
- Do not mark anything as verified unless the backend has actually completed the flow.

Technical scope:
- Add backend routes/callbacks for X OAuth, token handling, and disconnect flows.
- Add email verification tokens, expiry, confirmation endpoints, and verified-email fields.
- Update settings/profile APIs and UI state handling to consume persisted connection status.

Acceptance criteria:
- X and email connection states survive refreshes and are backed by stored server data.
- Notification preferences and trust signals depend on verified identity state, not raw strings.

Verification:
- Test connect, reconnect, disconnect, expired token, invalid token, and verified-email scenarios.
```

- [ ] Replace the mock X connect button in `SettingsPage` with a real OAuth flow.
- [ ] Implement backend X OAuth routes and callback handling.
- [ ] Persist X account identity and verification metadata in the database.
- [ ] Show connected X account state from backend truth instead of local UI toggles.
- [ ] Decide whether X verification should influence profile trust, badges, or NFT verification.
- [ ] Turn email binding into a real email verification flow.
- [ ] Add email verification tokens / expiry / confirmation endpoint.
- [ ] Add verified-email status in user settings/profile responses.
- [ ] Make notification email preferences depend on a verified email, not just a saved string.
- [ ] Add disconnect/reconnect flows for X and email.
- [ ] Add rate limits and replay protection for OAuth and email verification endpoints.

### P1 - Referral system

**Detailed AI Prompt**

```text
Task:
- Build a referral system for inviting clients and tracking attributable platform activity.
- Make attribution, payout math, and admin auditability explicit before implementation.

Not the task:
- Do not bolt on referral logic without a clear economic model.
- Do not allow self-referrals, ambiguous attribution, or wallet farming loopholes.

Technical scope:
- Define schema for referral codes, ownership, attribution, commission records, and payout status.
- Decide when attribution locks and how referral earnings relate to platform fees.
- Add member-facing sharing UX and admin reporting for performance and abuse review.

Acceptance criteria:
- Referral ownership, attribution, and payouts are explainable and auditable.
- The model fits the existing wallet onboarding and project/payment lifecycle.

Verification:
- Test referral creation, attribution, self-referral prevention, payout calculation, and admin review flows.
```

- [ ] Design the referral model: who can refer, who can be referred, and when attribution is locked.
- [ ] Add schema for referral codes, referral ownership, referred users, and payout records.
- [ ] Decide whether referrals apply to clients only or to both clients and freelancers.
- [ ] Decide how order cuts are calculated: platform fee split, extra commission, or separate referral pool.
- [ ] Add member-facing UI to generate/copy/share referral links.
- [ ] Add referral attribution during sign-up / first wallet verification.
- [ ] Add admin reporting for referral performance and abuse monitoring.
- [ ] Add protections against self-referral and wallet farming.
- [ ] Add payout visibility for referrers.
- [ ] Add policy text for referral eligibility and payout timing.

### P1 - AI integration verification

**Detailed AI Prompt**

```text
Task:
- Audit and verify all Gemini-powered user-facing flows.
- Decide whether AI calls should remain client-side or move server-side based on security and maintainability.

Not the task:
- Do not keep duplicated or unsafe AI flows just because they exist.
- Do not ship exposed key usage without an explicit justification.

Technical scope:
- Trace every `GoogleGenAI` import and all Gemini-dependent UI paths.
- Validate end-to-end runtime behavior for support chat and proposal assistance.
- Add fallback behavior, abuse protection, and clearer error handling around AI failure modes.

Acceptance criteria:
- AI features that remain are functional, scoped, and operationally safe.
- The repo has one intentional architecture for AI usage.

Verification:
- Test with valid key, missing key, rate-limited usage, guest state, and connected-wallet state.
```

- [ ] Verify the support chat flow actually works end-to-end with current Gemini configuration.
- [ ] Verify the AI proposal generator works end-to-end with current Gemini configuration.
- [ ] Audit where `GoogleGenAI` is imported and used across the frontend.
- [ ] Remove duplicated or unused Gemini-related imports/components.
- [ ] Decide whether Gemini calls should remain client-side or move server-side.
- [ ] If server-side is preferred, move API key usage off the client.
- [ ] Define fallback behavior when no API key is configured.
- [ ] Add usage limits / abuse protection for AI features.
- [ ] Add QA scenarios for wallet-connected users, guests, rate limits, and failure states.
- [ ] Validate prompt quality and tone against STXWORX product goals.

### P1 - NFTs and reputation

**Detailed AI Prompt**

```text
Task:
- Define one coherent NFT/reputation model and complete the missing lifecycle pieces.
- Clarify what each contract represents and how admin issuance/verification should work.

Not the task:
- Do not keep overlapping badge systems without explicit differentiation.
- Do not leave mint/verification flows half-off-chain and half-implicit.

Technical scope:
- Audit `rep-sft.clar`, `stxworx-badge.clar`, and `verify-soulbound.clar` plus all backend/admin/profile integrations.
- Define canonical roles for reputation, badges, and verification NFTs.
- Add mint confirmation, optional revocation/update flows, metadata validation, and consistent UI rendering.

Acceptance criteria:
- Contract roles are documented and reflected consistently in backend/admin/frontend behavior.
- Users and admins can understand the issuance lifecycle end to end.

Verification:
- Test admin issue, on-chain mint confirmation, profile rendering, and any revocation/update behavior that remains supported.
```

- [ ] Verify which NFT contracts are canonical: `rep-sft.clar`, `stxworx-badge.clar`, and `verify-soulbound.clar`.
- [ ] Reconcile markdown contract docs with the actual contracts present in `/contracts`.
- [ ] Confirm the intended distinction between reputation NFT, badge NFT, and verification soulbound NFT.
- [ ] Validate admin NFT issuance flow end-to-end.
- [ ] Add real mint confirmation workflows tied to on-chain tx verification.
- [ ] Add revocation/update flows if badges are supposed to be mutable by admin action.
- [ ] Decide whether user verification should mint an NFT automatically or remain an admin action.
- [ ] Surface NFT state consistently across profile, leaderboard, admin, and freelancer discovery pages.
- [ ] Add metadata integrity checks for NFT name, type, image, and description.
- [ ] Add tests for admin issue, confirm mint, and profile rendering.

### P1 - Marketplace consistency follow-through

**Detailed AI Prompt**

```text
Task:
- Clean up the remaining marketplace mismatches that still exist around docs, schema naming, disputes, and QA.
- Treat the escrow/refund architecture as complete and focus only on the remaining consistency gaps.

Not the task:
- Do not redesign the escrow contract or re-open already-finished refund architecture unless a new defect is discovered.
- Do not introduce alternate payment paths.

Technical scope:
- Reconcile docs with the real proposal schema and the canonical deployed `escrow` contract.
- Confirm the remaining dispute/admin flows match the deployed contract and backend expectations.
- Run final end-to-end QA across client, freelancer, and admin scenarios.

Acceptance criteria:
- Docs, backend behavior, frontend assumptions, and deployed contract naming are aligned.
- Remaining marketplace gaps are tracked separately from the already-finished escrow work.

Verification:
- Perform one documented QA pass covering proposal acceptance, activation, milestone release, dispute handling, and refund status visibility.
```

- [ ] Reconcile the docs with the real schema around `proposedAmount` on proposals.
- [x] Finalize the canonical deployed escrow contract as `escrow`.
- [ ] Update remaining docs and code references that still mention older escrow contract names.
- [x] Confirm `USDCx` remains an intended supported asset alongside `STX` and `sBTC`.
- [x] Audit the project activation path after escrow tx verification.
- [x] Audit milestone submission and release flow against contract assumptions.
- [ ] Audit dispute flow against admin resolution and reset flows.
- [x] Verify the DAO/platform fee logic against contracts, backend config, and UI copy.
- [ ] Run an end-to-end QA pass across client, freelancer, and admin flows.

### P1 - Notifications and messaging

**Detailed AI Prompt**

```text
Task:
- Expand notifications and messaging into a semantically correct communication layer.
- Align event types, deep links, unread state, and moderation hooks with marketplace and social events.

Not the task:
- Do not overload unrelated notification types.
- Do not fix only UI symptoms if the backend event taxonomy is wrong.

Technical scope:
- Review existing notification enums/types, creation logic, unread counters, and messaging permission rules.
- Add dedicated types for friend requests, referrals, NFT events, and verification state changes.
- Improve deep linking, read/unread syncing, and moderation/reporting readiness.

Acceptance criteria:
- Notifications represent the correct event type and lead users to the right destination.
- Messaging permissions remain consistent with connection/privacy settings.

Verification:
- Test event creation, unread count changes, navigation targets, and moderation/reporting hooks.
```

- [ ] Expand notification taxonomy to include friend request, friend accepted, referral events, NFT issued, and verification events.
- [ ] Stop reusing unrelated notification types for social/connection events.
- [ ] Add deep links from notifications to the correct destination pages.
- [ ] Add better unread/read syncing for notifications and conversations.
- [ ] Decide whether connection acceptance should optionally create a conversation automatically.
- [ ] Add moderation/reporting hooks for direct messages.

### P2 - Social and profile layer

**Detailed AI Prompt**

```text
Task:
- Decide the proper scope of the social/profile layer and strengthen the trust/discovery parts that help the marketplace.
- Keep the profile experience focused on credibility, relevance, and professional discovery.

Not the task:
- Do not expand social features in ways that distract from the marketplace mission.
- Do not treat posts as a core feature unless the audit clearly supports that decision.

Technical scope:
- Review profile completeness signals, discovery filters, trust indicators, and the role of social activity.
- Add stronger trust cues from verified email, X, and NFT state once those systems are real.
- Decide whether posts stay in launch scope or move to a later-stage roadmap.

Acceptance criteria:
- Profiles better communicate trust and relevance.
- The social layer has a deliberate scope and does not overshadow the marketplace.

Verification:
- Review profile, discovery, and social surfaces together to confirm the trust/discovery story is coherent.
```

- [ ] Review whether social posts are part of the core launch scope or a post-launch differentiator.
- [ ] Add profile trust indicators sourced from verified email/X/NFT state.
- [ ] Add stronger profile completion scoring.
- [ ] Add richer connection suggestions based on role, skills, or activity.
- [ ] Add better post moderation/reporting if social stays in scope.

### P2 - Settings and identity cleanup

**Detailed AI Prompt**

```text
Task:
- Clean up the settings and identity model so saved data, connected accounts, and verified identity are clearly separated.
- Make the UI render state truthfully from the backend.

Not the task:
- Do not keep ambiguous labels like "connected" when the backend has not verified anything.
- Do not rely on frontend-only toggles for identity status.

Technical scope:
- Refactor settings data contracts and UI sections around saved contact info versus verified/connected identity.
- Add normalized validation for email, handles, and URLs.
- Use optimistic UI only where rollback is trivial and safe.

Acceptance criteria:
- Users can distinguish saved info from verified identity at a glance.
- Identity-related settings are backed by server truth and explicit status labels.

Verification:
- Test settings rendering with empty, pending, connected, verified, and disconnected states.
```

- [ ] Separate "saved contact details" from "verified identity connections" in settings.
- [ ] Add explicit status labels for connected, verified, pending verification, and disconnected.
- [ ] Make settings UI reflect backend truth only.
- [ ] Add optimistic UI only where rollback is safe.
- [ ] Add validation and normalization for email, social handles, and URLs.

### P2 - Docs and developer experience

**Detailed AI Prompt**

```text
Task:
- Rewrite developer docs so they match the current STXWORX architecture, deployed contracts, runtime setup, and product direction.
- Reduce the gap between what the repo says and what the code actually does.

Not the task:
- Do not preserve stale docs for historical reasons unless they are explicitly archived.
- Do not describe deprecated router, contract, or payment assumptions as if they are current.

Technical scope:
- Audit root docs, markdown planning files, routing notes, dependency structure, and setup steps.
- Update references to the canonical `escrow` contract, actual routes mounted in `backend/index.ts`, and the real frontend routing stack.
- Clarify package structure and any intentional split between root and client dependencies.

Acceptance criteria:
- A new engineer or AI agent can read the docs and understand the current system without tripping over outdated assumptions.
- Setup, architecture, and contract references are accurate.

Verification:
- Follow the docs from a clean read-through and verify they match the real file structure, package scripts, and deployed contract names.
```

- [ ] Rewrite `markdowns/README.md` and root `README.md` to match the current codebase.
- [ ] Review all markdown files for stale contract names and outdated flow descriptions.
- [ ] Document the actual route map currently mounted in `backend/index.ts`.
- [ ] Document the actual frontend routing stack (`react-router-dom`) instead of older router assumptions.
- [ ] Consolidate duplicate or diverging dependency expectations between root `package.json` and `client/package.json`.
- [ ] Decide whether the repo should have one frontend package strategy or keep the current split deliberately.

## Suggested implementation order

1. Clean up product copy and remove deprecated payment directions.
2. Reconfirm the canonical proposal activation flow in UI, backend, and docs.
3. Rewrite core docs so they match the deployed `escrow` contract and current architecture.
4. Verify AI integration and decide client-side vs server-side strategy.
5. Build real X/email connection flows.
6. Upgrade connections into a proper friend request system.
7. Expand notifications/messaging to support the new relationship and identity events.
8. Reconcile and validate NFT/reputation flows.
9. Add the referral system.
10. Revisit the social/profile layer once trust signals and identity features are real.
