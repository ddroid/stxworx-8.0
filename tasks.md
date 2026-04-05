# STXWORX Task Backlog

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
