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

## Priority backlog

### P0 - Product alignment and cleanup

 **AI Prompt**
 ```text
 Goal: Realign the STXWORX codebase around its actual intended product: a Stacks-based freelance marketplace with escrow, milestones, admin moderation, social identity, and reputation.
 
 Vision: Remove dead-end or conflicting product directions so the platform has one coherent story, one canonical payment flow, and one consistent product surface. The result should feel intentional, production-minded, and easier to build on.
 
 Instructions: Audit all product-facing code, docs, copy, and workflows related to banner messaging, launch messaging, and proposal acceptance. Remove or refactor anything that conflicts with the intended escrow marketplace direction. Keep the canonical user journey simple: users sign in with wallet, clients post projects, freelancers submit proposals, clients fund and activate escrow, milestones are completed and released, disputes are handled through admin tools.
 
 Constraints: Completely abandon deprecated alternate payment flows. Do not preserve conflicting UX or documentation unless something must temporarily remain for migration safety. Prefer removing confusing code over keeping half-implemented abstractions.
 
 Definition of done: The repo presents one escrow marketplace direction, the banner/copy reflects the real platform, and the proposal-to-escrow activation path is clearly the single source of truth.
 ```
  
  - [ ] Remove the network status banner from the navbar announcement bar.
  - [ ] Remove legacy alternate-payment references from docs and planning files.
  - [ ] Remove unused deprecated payment code paths from backend, client, and shared modules.
  - [ ] Remove obsolete proposal acceptance progress tracking if it is no longer part of the intended flow.
  - [ ] Reconfirm the single canonical proposal acceptance flow: client accepts proposal, escrow tx is verified, project becomes active.
  - [ ] Update repo documentation so the product description matches the actual direction: escrow marketplace + admin/social/reputation.
  - [ ] Remove outdated launch/beta copy and stale dates from the top announcement content.
  
  ### P0 - Requested features to add

 **AI Prompt**
 ```text
 Goal: Turn the current backlog into a focused feature roadmap by implementing the highest-value missing product capabilities that align with STXWORX's marketplace and trust vision.
 
 Vision: STXWORX should feel like a credible on-chain work platform with strong trust, identity, referrals, and collaboration features. The product should make it easy for people to discover each other, verify credibility, invite new clients, and use AI responsibly as a support layer.
 
 Instructions: Treat the items in this section as strategic feature pillars. Break each one into backend, frontend, schema, API, UX, and QA requirements. Prefer solutions that integrate cleanly into the existing wallet-authenticated marketplace rather than bolting on disconnected features.
 
 Constraints: Do not reintroduce deprecated alternate payment flows or add features that dilute the marketplace focus. Keep the implementation grounded in the existing architecture: Express backend, Drizzle schema, React frontend, Stacks wallet auth, and admin moderation patterns.
 
 Definition of done: Each requested feature has a clear implementation path, technical scope, and product rationale that fits the long-term STXWORX platform vision.
 ```
  
  - [ ] Add a proper friend request system.
  - [ ] Add X and email connections.
  - [ ] Add a referral link system where a member can invite clients to the platform and get a cut of their orders.
  - [ ] Verify the AI integration.
  - [ ] Finish and validate the NFTs feature set.
  
  ### P1 - Friend request system

 **AI Prompt**
 ```text
 Goal: Replace the current lightweight connections feature with a real friend request and relationship system that supports trust, messaging, and social graph growth.
 
 Vision: Users should be able to discover other members, send requests, receive requests, accept or decline them, and clearly understand the state of every relationship. The system should feel deliberate, safe, and useful for collaboration on a professional marketplace.
 
 Instructions: Design and implement a complete friend-request lifecycle across schema, API, services, notifications, and UI. Make relationship state explicit everywhere it appears. Ensure messaging rules, profile CTAs, and connection suggestions all rely on the same backend truth.
 
 Constraints: Do not reuse unrelated notification types like proposal notifications for friend events. Avoid fake or local-only state. Support abuse prevention and future moderation.
 
 Definition of done: Users can send, receive, accept, decline, cancel, and remove friend connections with consistent state across profile pages, notifications, messaging permissions, and backend data.
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

 **AI Prompt**
 ```text
 Goal: Implement real identity connection flows for X and email so STXWORX can move from placeholder settings to meaningful, verifiable trust signals.
 
 Vision: Account connections should be real, persistent, and backed by the backend. Users should be able to connect X, verify email, and see clear status indicators that contribute to trust and credibility on the platform.
 
 Instructions: Replace mock UI behavior with actual OAuth and email verification workflows. Persist all relevant identity fields in the database, expose them through the API, and render them from backend truth. Design the system so these connections can later power trust badges, verification state, and profile reputation.
 
 Constraints: No fake connected states, no frontend-only toggles, and no verification status that is not backed by stored server data. Keep security in mind with rate limits, token expiry, and replay protection.
 
 Definition of done: X and email connections are real product features with proper backend flows, storage, verification state, and UI representation.
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

 **AI Prompt**
 ```text
 Goal: Build a referral system that allows members to invite clients to STXWORX and earn a transparent, auditable share of platform activity generated through those referrals.
 
 Vision: Referrals should feel like a serious platform growth feature, not a gimmick. Members should get a clear referral link, attribution should be trustworthy, payouts should be explainable, and admins should be able to audit everything.
 
 Instructions: Design the business logic, schema, attribution lifecycle, payout rules, admin tooling, and user-facing UX for referrals. Decide exactly when a referral becomes locked, how commissions are calculated, and how abuse is prevented. Build it in a way that fits wallet-based onboarding and the existing project/order lifecycle.
 
 Constraints: Prevent self-referrals, spam, and ambiguous attribution. Keep the economic model compatible with platform fees and marketplace integrity.
 
 Definition of done: Members can generate and share referral links, referred clients can be attributed correctly, payouts can be tracked, and admins can review performance and abuse signals.
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

 **AI Prompt**
 ```text
 Goal: Verify that AI features in STXWORX are functional, safe, maintainable, and aligned with the platform's real product role.
 
 Vision: AI should help users with support and proposal assistance without becoming a fragile or insecure dependency. The experience should feel polished, predictable, and intentionally scoped.
 
 Instructions: Audit every Gemini-related integration in the frontend and any supporting infrastructure. Confirm which features actually work, which are duplicated, and which should be refactored. Decide whether AI calls should remain client-side or move server-side, and improve failure handling, key management, rate limiting, and UX copy accordingly.
 
 Constraints: Do not leave exposed or poorly controlled AI flows in place if they compromise reliability or security. Avoid duplicated integrations and dead code.
 
 Definition of done: AI features have a clear architecture, verified runtime behavior, safe key handling, sensible fallbacks, and product-consistent prompts.
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

 **AI Prompt**
 ```text
 Goal: Reconcile and complete the NFT and reputation layer so it becomes a coherent trust system rather than a partially wired set of contracts, tables, and UI assets.
 
 Vision: STXWORX should use NFTs and soulbound-style badges to represent reputation, verification, or platform-earned status in a way that is clear to users, consistent in code, and connected to admin workflows.
 
 Instructions: Identify the canonical NFT contracts, define the intended role of each NFT type, and align docs, backend flows, admin tools, and frontend displays around that model. Verify the full lifecycle from issuance decision to mint confirmation to profile rendering.
 
 Constraints: Do not keep ambiguous contract roles or overlapping badge systems without explicit differentiation. Favor one clear mental model for users and admins.
 
 Definition of done: The repo has a clearly defined NFT/reputation architecture, verified mint flows, aligned docs, and consistent UI display across profile, admin, and discovery surfaces.
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
  
  ### P1 - Core marketplace consistency

 **AI Prompt**
 ```text
 Goal: Align the marketplace implementation, schema, contracts, backend logic, and documentation so the core STXWORX work flow is internally consistent and trustworthy.
 
 Vision: The heart of the product should be rock-solid: projects, proposals, escrow activation, milestone submission, release, disputes, and fees should all reflect the same business rules across contracts, backend, UI, and docs.
 
 Instructions: Audit the end-to-end marketplace flow and identify mismatches between schema, API behavior, frontend assumptions, contract versions, and documentation. Clarify the intended support for assets like USDCx, confirm fee logic, and ensure dispute/admin behavior matches contract reality.
 
 Constraints: Prioritize correctness over preserving outdated docs or legacy assumptions. If code and docs diverge, establish a single canonical model and update the rest to match it.
 
 Definition of done: The core marketplace flow is documented accurately, implemented consistently, and validated across client, freelancer, and admin scenarios.
 ```
  
  - [ ] Reconcile the docs with the real schema around `proposedAmount` on proposals.
  - [ ] Reconcile docs and code around contract versioning; docs mention older contract names while `/contracts` contains newer files.
  - [ ] Reconfirm whether USDCx is truly supported in the intended product or only partially introduced.
  - [ ] Audit the project activation path after escrow tx verification.
- [ ] Audit milestone submission and release flow against contract assumptions.
  - [ ] Audit dispute flow against admin resolution and reset flows.
  - [ ] Verify the DAO/platform fee logic against contracts, backend config, and UI copy.
  - [ ] Run an end-to-end QA pass across client, freelancer, and admin flows.
  
  ### P1 - Notifications and messaging

 **AI Prompt**
 ```text
 Goal: Upgrade notifications and messaging into a coherent communication layer that reflects real marketplace and social events accurately.
 
 Vision: Notifications should feel relevant, traceable, and actionable. Messaging should respect relationship settings and moderation needs. Together they should support trust, collaboration, and responsiveness across the platform.
 
 Instructions: Review the current notification taxonomy, identify misused event types, and introduce dedicated types for connection, referral, verification, NFT, and other missing events. Improve message/notification state syncing, deep linking, and moderation readiness. Make sure communication features align with friend relationships and user messaging preferences.
 
 Constraints: Do not overload unrelated event types. Avoid shallow UI-only fixes if the underlying backend event model is wrong.
 
 Definition of done: Notifications are semantically correct, message permissions are consistent, unread counts stay in sync, and users can act on events through clear links and flows.
 ```
  
  - [ ] Expand notification taxonomy to include friend request, friend accepted, referral events, NFT issued, and verification events.
  - [ ] Stop reusing unrelated notification types for social/connection events.
  - [ ] Add deep links from notifications to the correct destination pages.
  - [ ] Add better unread/read syncing for notifications and conversations.
  - [ ] Decide whether connection acceptance should optionally create a conversation automatically.
  - [ ] Add moderation/reporting hooks for direct messages.
  
  ### P2 - Social and profile layer

 **AI Prompt**
 ```text
 Goal: Decide the role of the social/profile layer in STXWORX and strengthen it so it supports marketplace trust and discovery rather than feeling disconnected.
 
 Vision: Profiles should communicate credibility, completeness, and relevance. Social features should either meaningfully support marketplace engagement or be clearly scoped as a later differentiator.
 
 Instructions: Evaluate whether posts and social activity are core launch features or secondary. Improve profile trust indicators, completion scoring, and discovery quality so users can quickly judge who is credible and relevant to work with.
 
 Constraints: Keep this layer subordinate to the marketplace mission. Do not expand social features in ways that distract from professional identity, discovery, and trust.
 
 Definition of done: The social/profile layer has a clear role in the product, better trust cues, stronger discovery signals, and a deliberate scope.
 ```
  
  - [ ] Review whether social posts are part of the core launch scope or a post-launch differentiator.
  - [ ] Add profile trust indicators sourced from verified email/X/NFT state.
  - [ ] Add stronger profile completion scoring.
  - [ ] Add richer connection suggestions based on role, skills, or activity.
  - [ ] Add better post moderation/reporting if social stays in scope.
  
  ### P2 - Settings and identity cleanup

 **AI Prompt**
 ```text
 Goal: Clean up the settings and identity model so users can clearly distinguish between saved data, connected accounts, and verified identity signals.
 
 Vision: Settings should be truthful, understandable, and reliable. A user should always know whether an email is merely saved, whether X is actually connected, and whether something is verified, pending, or disconnected.
 
 Instructions: Refactor settings UX and API contracts so identity-related states are modeled explicitly. Separate editable contact info from verified identity connections, normalize inputs, and make the frontend render only what the backend has actually confirmed.
 
 Constraints: Avoid ambiguous labels and frontend-only assumptions. Do not collapse verification and simple data storage into the same state model.
 
 Definition of done: The settings experience accurately represents identity status, uses normalized data, and is backed by clear server-side truth.
 ```
  
  - [ ] Separate "saved contact details" from "verified identity connections" in settings.
  - [ ] Add explicit status labels for connected, verified, pending verification, and disconnected.
  - [ ] Make settings UI reflect backend truth only.
  - [ ] Add optimistic UI only where rollback is safe.
  - [ ] Add validation and normalization for email, social handles, and URLs.
  
  ### P2 - Docs and developer experience

 **AI Prompt**
 ```text
 Goal: Make the repository documentation and developer guidance accurately reflect the real STXWORX architecture, flows, dependencies, and product direction.
 
 Vision: A new engineer or AI agent should be able to read the docs and immediately understand what the platform is, how it works, what is canonical, and what has been abandoned. The repo should feel coherent rather than historically layered.
 
 Instructions: Review root docs, markdown planning files, route maps, dependency structure, and frontend/backend architecture notes. Remove stale alternate-payment directions, fix outdated contract/version references, and document the actual runtime and routing setup used today.
 
 Constraints: Do not preserve confusing or obsolete documentation just because it exists. Prefer fewer, more accurate docs over many divergent ones.
 
 Definition of done: The repo docs describe the real system, abandoned directions are archived or removed, and the developer experience is clearer for both humans and AI tools.
 ```
  
  - [ ] Rewrite `markdowns/README.md` and root `README.md` to match the current codebase.
  - [ ] Replace the legacy alternate-payment markdown with a neutral archival note or remove it.
  - [ ] Review all markdown files for stale contract names and outdated flow descriptions.
  - [ ] Document the actual route map currently mounted in `backend/index.ts`.
  - [ ] Document the actual frontend routing stack (`react-router-dom`) instead of older router assumptions.
  - [ ] Consolidate duplicate or diverging dependency expectations between root `package.json` and `client/package.json`.
  - [ ] Decide whether the repo should have one frontend package strategy or keep the current split deliberately.

## Suggested implementation order

1. Remove deprecated alternate payment paths and outdated product copy.
2. Remove the network banner.
3. Verify AI integration and decide client-side vs server-side strategy.
4. Build real X/email connection flows.
5. Upgrade connections into a proper friend request system.
6. Reconcile and validate NFT/reputation flows.
7. Add the referral system.
8. Clean and align docs after the product direction is locked.
