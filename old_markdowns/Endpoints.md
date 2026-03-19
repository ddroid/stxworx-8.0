# STXWORX API Endpoints

## Auth — Users (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/verify-wallet` | No | Verify Stacks signed message (stxAddress, publicKey, signature, message, role). Creates user on first login with chosen role (client/freelancer). Issues JWT in httpOnly cookie `stxworx_token`. Role is immutable after first login. |
| POST | `/api/auth/logout` | No | Clears the user JWT cookie. |
| GET | `/api/auth/me` | User | Returns the authenticated user's profile (id, stxAddress, username, role, isActive, createdAt). |

---

## Auth — Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/login` | No | Admin login with username + password. Verifies scrypt-hashed password. Issues admin JWT in httpOnly cookie `stxworx_admin_token` (uses separate signing secret from user JWT). |
| POST | `/api/admin/logout` | No | Clears the admin JWT cookie. |
| GET | `/api/admin/me` | Admin | Returns the authenticated admin's info (id, username). |

---

## Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/:address` | No | Get a user's public profile by their STX address. Returns id, stxAddress, username, role, isActive, createdAt. |
| PATCH | `/api/users/me` | User | Update your own profile. Accepts: username. |
| GET | `/api/users/:address/reviews` | No | Get all reviews received by a user (looked up by STX address). |

---

## Projects (`/api/projects`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/projects` | User (client only) | Create a new project listing. Requires: title, description, category, tokenType (STX/sBTC), numMilestones (1-4), milestone amounts/titles. Role-checked — only clients can post. |
| GET | `/api/projects` | No | Browse all open projects (public marketplace). Supports query filters: `category`, `tokenType`, `search`. Returns computed `budget` (sum of milestone amounts). |
| GET | `/api/projects/:id` | No | Get full project details by ID. Includes computed budget. |
| PATCH | `/api/projects/:id` | User (owner) | Update a project. Only the client who posted it can update, and only while status is 'open'. |
| DELETE | `/api/projects/:id` | User (owner) | Cancel a project. Only the client owner can cancel, and only while status is 'open'. Sets status to 'cancelled'. |
| GET | `/api/projects/my/posted` | User | Get all projects posted by the authenticated client. |
| GET | `/api/projects/my/active` | User | Get all active projects where the user is either the client or freelancer. |
| PATCH | `/api/projects/:id/activate` | User (owner) | Activate a project after on-chain escrow confirms. Requires: escrowTxId, onChainId. Sets status to 'active'. |

---

## Proposals (`/api/proposals`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/proposals` | User (freelancer only) | Submit a proposal for a project. Requires: projectId, coverLetter. Role-checked — only freelancers can submit. One proposal per freelancer per project. Project must be 'open'. |
| GET | `/api/proposals/project/:projectId` | User (project owner) | Get all proposals for a project. Only the client who owns the project can view proposals. |
| GET | `/api/proposals/my` | User | Get all proposals submitted by the authenticated freelancer. |
| PATCH | `/api/proposals/:id/accept` | User (project owner) | Accept a proposal. Assigns the freelancer to the project. Auto-rejects all other pending proposals for that project. Frontend then triggers the wallet escrow flow. |
| PATCH | `/api/proposals/:id/reject` | User (project owner) | Reject a proposal. Only the client who owns the project can reject. |
| PATCH | `/api/proposals/:id/withdraw` | User (proposal owner) | Withdraw your own proposal. Only the freelancer who submitted it can withdraw. |

---

## Milestones (`/api/milestones`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/milestones/submit` | User (freelancer) | Submit a milestone deliverable. Requires: projectId, milestoneNum (1-4), deliverableUrl (GitHub/Figma/Drive link). Optional: description, completionTxId (on-chain complete-milestone tx hash). Only the assigned freelancer can submit. Project must be 'active'. |
| PATCH | `/api/milestones/:id/approve` | User (client) | Approve a milestone submission and record the release transaction. Requires: releaseTxId (on-chain release-milestone tx hash). Only the client who owns the project can approve. If all milestones are approved, project status moves to 'completed'. |
| PATCH | `/api/milestones/:id/reject` | User (client) | Reject a milestone submission. Freelancer must resubmit. Only the project client can reject. |
| GET | `/api/milestones/project/:projectId` | User | Get all milestone submissions for a project. |

---

## Disputes (`/api/disputes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/disputes` | User | File a dispute on an active project. Requires: projectId, milestoneNum, reason. Optional: evidenceUrl, disputeTxId (on-chain file-dispute tx hash). Either the client or freelancer on the project can file. Sets project status to 'disputed'. |
| GET | `/api/disputes/project/:projectId` | User | Get all disputes for a project. |

---

## Reviews (`/api/reviews`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews` | User | Leave a review on a completed project. Requires: projectId, revieweeId, rating (1-5). Optional: comment. Only parties involved in the project can review. One review per reviewer per project. Project must be 'completed'. Cannot review yourself. |

---

## Categories (`/api/categories`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | No | Get all categories with their subcategories. Returns: id, name, icon (Lucide icon name), subcategories array. |

---

## Admin — Dashboard (`/api/admin/dashboard`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Get dashboard overview stats: totalUsers, totalProjects, activeProjects, openDisputes. |

---

## Admin — Projects (`/api/admin/projects`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/projects` | Admin | Get all projects with optional filters: `status`, `search`. No ownership restriction — admin sees everything. |
| GET | `/api/admin/projects/:id` | Admin | Get full project detail including all milestone submissions and disputes for that project. |

---

## Admin — Disputes (`/api/admin/disputes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/disputes` | Admin | Get all open disputes. |
| PATCH | `/api/admin/disputes/:id/resolve` | Admin | Resolve a dispute. Requires: resolution (admin's decision notes), resolutionTxId (on-chain admin-resolve-dispute tx hash). Records who resolved it and when. |
| PATCH | `/api/admin/disputes/:id/reset` | Admin | Reset a milestone via dispute. Requires: resolution, resolutionTxId. Sets dispute status to 'reset' so the freelancer can resubmit. |

---

## Admin — Abandoned Project Recovery (`/api/admin/recovery`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/recovery/abandoned` | Admin | List projects with no activity past timeout thresholds (active projects not updated in 7+ days). |
| PATCH | `/api/admin/recovery/force-release` | Admin | Record a force-release after admin calls `admin-force-release-stx/sbtc` on-chain. Requires: projectId, milestoneNum, txId. Updates the milestone submission status to 'approved'. |
| PATCH | `/api/admin/recovery/force-refund` | Admin | Record a force-refund after admin calls `admin-force-refund-stx/sbtc` on-chain. Requires: projectId, txId. Sets project status to 'refunded'. |

---

## Admin — Users (`/api/admin/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | Admin | Get all users with their details. |
| PATCH | `/api/admin/users/:id/status` | Admin | Activate or deactivate a user. Requires: isActive (boolean). |

---

## Admin — NFT Releases (`/api/admin/nfts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/nfts` | Admin | Create an NFT record for a user (reputation/loyalty). Requires: recipientId, nftType (milestone_streak/top_freelancer/top_client/loyalty/custom), name. Optional: description, metadataUrl. |
| GET | `/api/admin/nfts` | Admin | List all issued NFTs. Supports query filters: `nftType`, `minted` (true/false). |
| PATCH | `/api/admin/nfts/:id/confirm-mint` | Admin | Record the on-chain mint transaction after admin mints the NFT. Requires: mintTxId. Sets minted to true. |
| GET | `/api/admin/nfts/user/:userId` | Admin | Get all NFTs issued to a specific user. |



Phase 1 - Foundation:

schema.ts — 9 tables (users, admins, projects, proposals, milestone_submissions, disputes, reviews, categories, reputation_nfts) with Zod schemas and TypeScript types
db.ts — Drizzle + PostgreSQL connection
drizzle.config.ts — Updated schema path
auth.ts — User JWT (wallet-based), requireAuth, requireRole('client'|'freelancer')
admin-auth.ts — Admin JWT (separate secret), requireAdmin
seed.ts — Seeds 7 categories + default admin account
Phase 2 - Auth:

auth.service.ts — verifyMessageSignatureRsv from @stacks/encryption, user upsert, JWT
admin-auth.service.ts — scrypt password hashing, admin JWT
auth.controller.ts — verify-wallet, logout, me
auth.routes.ts — Rate-limited auth routes
Phase 3 - Users & Categories:

user.controller.ts + user.routes.ts
category.controller.ts + category.routes.ts
Phase 4 - Projects & Proposals:

project.service.ts — Budget computation, status transitions
project.controller.ts + project.routes.ts
proposal.service.ts — Accept logic (auto-reject others)
proposal.controller.ts + proposal.routes.ts
Phase 5 - Milestones, Disputes, Reviews:

milestone.controller.ts + milestone.routes.ts
dispute.controller.ts + dispute.routes.ts
review.controller.ts + review.routes.ts
Phase 6 - Admin:

admin.service.ts — Dashboard aggregations, abandoned project detection, NFT management
admin.controller.ts — Login, dashboard, disputes, recovery, users, NFTs
admin.routes.ts — All admin endpoints
Phase 7 - Entry Point:

index.ts — CORS, rate limiting, cookie parser, all routes mounted
check-db.ts — Updated health check