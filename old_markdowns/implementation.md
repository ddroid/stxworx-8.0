# STXWORX Backend Implementation Plan

## Architecture Overview

**Stack:** Express.js + Drizzle ORM + MySQL + Zod validation
**Auth (Users):** Wallet-based (Stacks message signing) + JWT sessions
**Auth (Admin):** Username + password (scrypt hashing) + JWT sessions — completely separate
**Pattern:** Clean layered architecture — Routes → Controllers → Services → Storage (DB)

The backend serves as the **off-chain coordination layer**. All financial transactions happen on-chain via the Clarity smart contract. The backend manages job listings, proposals, deliverables, user profiles, NFT reputation, and provides the API surface for the frontend.

---

## 1. Database Schema (`shared/schema.ts`)

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| stx_address | varchar(255) | Unique, indexed. Primary identifier |
| username | varchar(100) | Display name |
| role | enum('client','freelancer') | Set once at first login, immutable |
| is_active | boolean | Default: true |
| created_at | timestamp | Default: now() |
| updated_at | timestamp | Default: now() |

> No password field. Auth is wallet signature verification (Stacks message signing).
> Role is chosen once after first wallet connect and cannot be changed.
> Backend enforces role: clients can only post projects, freelancers can only submit proposals.

#### `admins`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| username | varchar(100) | Unique |
| password_hash | varchar(500) | scrypt hashed |
| created_at | timestamp | Default: now() |

> Completely separate from `users`. No wallet address. No self-registration.
> Admin accounts are created only via seed script or by another admin.
> Admin JWT uses a different signing secret from user JWT to prevent token confusion.

#### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| client_id | int FK → users | Who posted the job |
| title | varchar(200) | |
| description | text | |
| category | varchar(100) | |
| subcategory | varchar(100) | Nullable |
| token_type | enum('STX','sBTC') | Payment currency |
| num_milestones | int | 1–4 |
| milestone_1_title | varchar(200) | |
| milestone_1_description | text | Nullable |
| milestone_1_amount | numeric | In micro-units |
| milestone_2_title | varchar(200) | Nullable |
| milestone_2_description | text | Nullable |
| milestone_2_amount | numeric | Default: 0 |
| milestone_3_title | varchar(200) | Nullable |
| milestone_3_description | text | Nullable |
| milestone_3_amount | numeric | Default: 0 |
| milestone_4_title | varchar(200) | Nullable |
| milestone_4_description | text | Nullable |
| milestone_4_amount | numeric | Default: 0 |
| status | enum('open','active','completed','cancelled','disputed','refunded') | Default: 'open' |
| freelancer_id | int FK → users | Nullable, set on proposal accept |
| on_chain_id | int | Nullable, set after escrow tx confirms |
| escrow_tx_id | varchar(100) | Nullable, the on-chain create-project tx hash |
| created_at | timestamp | |
| updated_at | timestamp | |

> `status = 'open'` means posted but no freelancer assigned yet.
> `status = 'active'` means proposal accepted AND escrow funded on-chain.
> No `budget` column — total budget is computed as sum of milestone amounts on read.

#### `proposals`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| project_id | int FK → projects | |
| freelancer_id | int FK → users | |
| cover_letter | text | |
| status | enum('pending','accepted','rejected','withdrawn') | Default: 'pending' |
| created_at | timestamp | |
| updated_at | timestamp | |

> Unique constraint on (project_id, freelancer_id) — one proposal per freelancer per project.
> No `proposed_amount` — the client sets milestone amounts when posting the project.
> The smart contract's `create-project-stx` takes fixed amounts from the client. There is no on-chain negotiation mechanism.

#### `milestone_submissions`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| project_id | int FK → projects | |
| milestone_num | int | 1–4 |
| freelancer_id | int FK → users | |
| deliverable_url | varchar(500) | GitHub, Figma, Google Drive link |
| description | text | Nullable |
| status | enum('submitted','approved','rejected','disputed') | Default: 'submitted' |
| completion_tx_id | varchar(100) | Nullable, on-chain complete-milestone tx |
| release_tx_id | varchar(100) | Nullable, on-chain release-milestone tx |
| submitted_at | timestamp | |
| reviewed_at | timestamp | Nullable |

#### `disputes`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| project_id | int FK → projects | |
| milestone_num | int | 1–4 |
| filed_by | int FK → users | |
| reason | text | Off-chain context for admin |
| evidence_url | varchar(500) | Nullable |
| status | enum('open','resolved','reset') | Default: 'open' |
| resolution | text | Nullable, admin's decision notes |
| resolved_by | int FK → admins | Nullable (admin who resolved it) |
| dispute_tx_id | varchar(100) | Nullable, on-chain file-dispute tx |
| resolution_tx_id | varchar(100) | Nullable, on-chain resolution tx |
| created_at | timestamp | |
| resolved_at | timestamp | Nullable |

#### `reviews`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| project_id | int FK → projects | |
| reviewer_id | int FK → users | Who wrote the review |
| reviewee_id | int FK → users | Who is being reviewed |
| rating | int | 1–5 |
| comment | text | Nullable |
| created_at | timestamp | |

> Unique constraint on (project_id, reviewer_id) — one review per party per project.

#### `categories`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar(100) | Unique |
| icon | varchar(50) | Lucide icon name |
| subcategories | json | |

#### `reputation_nfts`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| recipient_id | int FK → users | Who receives the NFT |
| nft_type | enum('milestone_streak','top_freelancer','top_client','loyalty','custom') | |
| name | varchar(200) | Display name of the NFT |
| description | text | Nullable |
| metadata_url | varchar(500) | Nullable, link to NFT metadata/image |
| mint_tx_id | varchar(100) | Nullable, on-chain mint tx hash |
| minted | boolean | Default: false |
| issued_by | int FK → admins | Admin who issued it |
| created_at | timestamp | |

> Admin creates the NFT record off-chain, then mints on-chain.
> `minted` flips to true once mint tx confirms.
> Requires a separate NFT smart contract (SIP-009 compliant) for on-chain minting.

---

## 2. API Design

All user-facing endpoints prefixed with `/api`. Admin endpoints prefixed with `/api/admin`.
User routes require wallet-based JWT. Admin routes require password-based JWT (different signing secret).

### Auth — Users (`/api/auth`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/verify-wallet` | Verify Stacks signed message, create user if first time, issue JWT | No |
| POST | `/logout` | Clear JWT cookie | Yes |
| GET | `/me` | Get current user profile | Yes |

> **How wallet auth works:**
> 1. Frontend asks user to sign a challenge message with their Stacks wallet
> 2. Frontend sends `{ stxAddress, publicKey, signature, message, role }` to `POST /api/auth/verify-wallet`
> 3. Backend verifies the signature using `verifyMessageSignatureRsv` from **`@stacks/encryption`**
> 4. If valid, upserts user record by `stx_address` (sets `role` on first login), issues JWT in httpOnly cookie
> 5. `role` is only set on first login — subsequent logins ignore the `role` field
>
> **Required new dependency:** `@stacks/encryption` (not currently in package.json)

### Auth — Admin (`/api/admin`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/login` | Admin username + password login, issue admin JWT | No |
| POST | `/logout` | Clear admin JWT cookie | Admin |
| GET | `/me` | Get current admin info | Admin |

> Admin JWT uses a different cookie name and signing secret from user JWT.
> Admin accounts are seeded — no registration endpoint.

### Users (`/api/users`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/:address` | Get public profile by STX address | No |
| PATCH | `/me` | Update own profile (bio, skills, avatar, username) | Yes |
| GET | `/:address/reviews` | Get reviews for a user | No |

### Projects (`/api/projects`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create project listing (client only, role-checked) | Yes |
| GET | `/` | Browse all open projects — public marketplace (filters: category, token, budget range) | No |
| GET | `/:id` | Get project details | No |
| PATCH | `/:id` | Update project (client owner, only while status='open') | Yes |
| DELETE | `/:id` | Cancel project (client owner, only while status='open') | Yes |
| GET | `/my/posted` | My posted projects (client view) | Yes |
| GET | `/my/active` | My active projects (as client or freelancer) | Yes |
| PATCH | `/:id/activate` | Set project to active after on-chain escrow confirms (sends txId + onChainId) | Yes |

### Proposals (`/api/proposals`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Submit proposal (freelancer only, role-checked) | Yes |
| GET | `/project/:projectId` | Get all proposals for a project (client who owns it) | Yes |
| GET | `/my` | My proposals (freelancer view) | Yes |
| PATCH | `/:id/accept` | Accept proposal (client) — frontend then triggers wallet escrow flow | Yes |
| PATCH | `/:id/reject` | Reject proposal (client) | Yes |
| PATCH | `/:id/withdraw` | Withdraw own proposal (freelancer) | Yes |

### Milestones (`/api/milestones`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/submit` | Submit milestone deliverable + completion txId (freelancer) | Yes |
| PATCH | `/:id/approve` | Record milestone approval + release txId (client) | Yes |
| PATCH | `/:id/reject` | Reject submission, freelancer must resubmit (client) | Yes |
| GET | `/project/:projectId` | Get all submissions for a project | Yes |

### Disputes (`/api/disputes`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | File dispute with reason + evidence + dispute txId (client or freelancer) | Yes |
| GET | `/project/:projectId` | Get disputes for a project | Yes |

### Reviews (`/api/reviews`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Leave review (only on completed projects, one per party) | Yes |

### Categories (`/api/categories`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | Get all categories with subcategories | No |

### Admin — Dashboard (`/api/admin/dashboard`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | Overview: TVL, active jobs, open disputes, total user count | Admin |

### Admin — Jobs Queue (`/api/admin/projects`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | All projects with filters (status, search, date range) | Admin |
| GET | `/:id` | Full project detail with milestones, submissions, disputes | Admin |

### Admin — Disputes (`/api/admin/disputes`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | All open disputes | Admin |
| PATCH | `/:id/resolve` | Record dispute resolution + on-chain tx (force release or force refund) | Admin |
| PATCH | `/:id/reset` | Record milestone reset + on-chain tx | Admin |

### Admin — Abandoned Project Recovery (`/api/admin/recovery`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/abandoned` | List projects with no activity past timeout thresholds | Admin |
| PATCH | `/force-release` | Record force-release after admin calls `admin-force-release-stx/sbtc` on-chain (sends projectId, milestoneNum, txId) | Admin |
| PATCH | `/force-refund` | Record force-refund after admin calls `admin-force-refund-stx/sbtc` on-chain (sends projectId, txId) | Admin |

> These endpoints update the off-chain project/milestone status AFTER the admin has completed the on-chain transaction.
> Smart contract timeouts: force-release = 144 blocks (~24h after milestone completion), force-refund = 1008 blocks (~7 days of inactivity).

### Admin — Users (`/api/admin/users`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | All users with stats (projects count, earnings, reports) | Admin |
| PATCH | `/:id/status` | Activate/deactivate a user | Admin |

### Admin — NFT Releases (`/api/admin/nfts`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create NFT record for a user (reputation/loyalty) | Admin |
| GET | `/` | List all issued NFTs with filters (type, minted status) | Admin |
| PATCH | `/:id/confirm-mint` | Record on-chain mint txId after admin mints the NFT | Admin |
| GET | `/user/:userId` | Get all NFTs for a specific user | Admin |

> NFT minting happens on-chain via a separate SIP-009 NFT contract.
> The backend tracks issuance and mint status off-chain.

---

## 3. File Structure

```
backend/
├── index.ts                    # Express app bootstrap, middleware, route mounting
├── db.ts                       # Drizzle ORM + MySQL connection
├── drizzle.config.ts           # Drizzle Kit config
├── seed.ts                     # Seed categories + default admin account
├── middleware/
│   ├── auth.ts                 # User JWT verification (wallet-based), requireAuth, requireRole
│   └── admin-auth.ts           # Admin JWT verification (password-based), requireAdmin
├── routes/
│   ├── auth.routes.ts          # /api/auth/*
│   ├── user.routes.ts          # /api/users/*
│   ├── project.routes.ts       # /api/projects/*
│   ├── proposal.routes.ts      # /api/proposals/*
│   ├── milestone.routes.ts     # /api/milestones/*
│   ├── dispute.routes.ts       # /api/disputes/*
│   ├── review.routes.ts        # /api/reviews/*
│   ├── category.routes.ts      # /api/categories/*
│   └── admin.routes.ts         # /api/admin/* (all admin endpoints)
├── controllers/
│   ├── auth.controller.ts      # Wallet verify + user JWT
│   ├── user.controller.ts
│   ├── project.controller.ts
│   ├── proposal.controller.ts
│   ├── milestone.controller.ts
│   ├── dispute.controller.ts
│   ├── review.controller.ts
│   ├── category.controller.ts
│   └── admin.controller.ts     # Admin login, dashboard, disputes, recovery, users, NFTs
├── services/
│   ├── auth.service.ts         # Wallet signature verification (verifyMessageSignatureRsv), JWT
│   ├── admin-auth.service.ts   # Password hashing (scrypt), admin JWT
│   ├── project.service.ts      # Project business logic, budget computation
│   ├── proposal.service.ts     # Proposal accept/reject logic, auto-reject others
│   └── admin.service.ts        # Dashboard aggregations, abandoned project detection
└── check-db.ts                 # DB connection health check

shared/
└── schema.ts                   # Drizzle table definitions + Zod schemas + types
```

**Total: ~27 files.** Each file has a single clear responsibility.

---

## 4. Key Design Decisions

### On-chain vs Off-chain Boundary
| Action | Where | Why |
|--------|-------|-----|
| Post a project listing | Off-chain (DB) | No funds involved yet |
| Submit/review proposals | Off-chain (DB) | Negotiation, no funds |
| Accept proposal + fund escrow | On-chain (smart contract) | Locks real funds |
| Submit milestone deliverable | Off-chain (DB) + On-chain (complete-milestone) | Deliverable link is off-chain, completion signal is on-chain |
| Approve + release payment | On-chain (release-milestone) | Moves real funds |
| File dispute | On-chain (file-dispute) + Off-chain (reason/evidence) | On-chain blocks releases, off-chain stores context |
| Admin resolve dispute | On-chain (admin-resolve-dispute) | Moves real funds |
| Admin force release/refund | On-chain (admin-force-release/refund) | Moves real funds |
| Issue reputation NFT | Off-chain (DB) + On-chain (NFT mint) | Record off-chain, mint on-chain |
| Leave review | Off-chain (DB) | Reputation, no funds |

### Auth Architecture (Dual System)
**User Auth (wallet-based):**
1. Frontend asks user to sign a challenge message with their Stacks wallet
2. Frontend sends `{ stxAddress, publicKey, signature, message, role }` to `POST /api/auth/verify-wallet`
3. Backend verifies signature using `verifyMessageSignatureRsv` from `@stacks/encryption`
4. If valid, upserts user record by `stx_address`, issues JWT in httpOnly cookie (`stxworx_token`)
5. `role` (client/freelancer) is set on first login only — immutable after that

**Admin Auth (password-based):**
1. Admin sends `{ username, password }` to `POST /api/admin/login`
2. Backend verifies password hash (scrypt), issues admin JWT in httpOnly cookie (`stxworx_admin_token`)
3. Admin JWT uses a **different signing secret** (`JWT_ADMIN_SECRET`) from user JWT (`JWT_SECRET`)
4. Admin accounts created via seed script or by existing admin — no self-registration

### Role Enforcement
- `role` is set once at first wallet connection — `client` or `freelancer`
- Backend checks role on every write endpoint:
  - `POST /api/projects` → rejects if `role !== 'client'`
  - `POST /api/proposals` → rejects if `role !== 'freelancer'`
- Browse/view endpoints (marketplace) are public — no role check needed
- A user who wants to be both client and freelancer needs two separate wallets

### Transaction ID Storage
When the frontend completes an on-chain transaction, it sends the resulting `txId` back to the backend via a PATCH endpoint. This links off-chain records to on-chain state. The backend does NOT call the blockchain — the frontend handles all wallet interactions.

### Budget Computation
No `budget` column stored. Total budget is computed on read:
```
budget = milestone_1_amount + milestone_2_amount + milestone_3_amount + milestone_4_amount
```
This avoids data inconsistency between stored budget and actual milestone amounts.

### Status Transitions
```
Project:  open → active → completed
               → active → disputed → active (after resolution)
               → active → disputed → refunded (if refund decided)
               → active → refunded (abandoned project recovery)
               → cancelled (client cancels before escrow)

Proposal: pending → accepted | rejected | withdrawn

Milestone Submission: submitted → approved | rejected | disputed

Dispute (disputes table): open → resolved | reset
```

> Note: `disputed` and `refunded` are project-level statuses. `resolved` and `reset` are dispute-level statuses only.
> When a dispute is resolved, the project goes back to `active` (work continues) or to `refunded` (funds returned).

---

## 5. Implementation Order

### Phase 1: Foundation
1. `shared/schema.ts` — All Drizzle table definitions (users, admins, projects, proposals, milestone_submissions, disputes, reviews, categories, reputation_nfts), Zod insert/select schemas, TypeScript types
2. `backend/db.ts` — Database connection
3. `backend/drizzle.config.ts` — Migration config
4. `backend/middleware/auth.ts` — User JWT verification, requireAuth, requireRole('client'|'freelancer')
5. `backend/middleware/admin-auth.ts` — Admin JWT verification, requireAdmin
6. `backend/seed.ts` — Seed categories + default admin account

### Phase 2: Auth
7. `backend/services/auth.service.ts` — `verifyMessageSignatureRsv` from `@stacks/encryption`, user JWT
8. `backend/services/admin-auth.service.ts` — scrypt password hashing, admin JWT
9. `backend/controllers/auth.controller.ts` — wallet verify, logout, me
10. `backend/routes/auth.routes.ts`

### Phase 3: Users & Categories
11. `backend/controllers/user.controller.ts`
12. `backend/routes/user.routes.ts`
13. `backend/controllers/category.controller.ts`
14. `backend/routes/category.routes.ts`

### Phase 4: Projects & Proposals (core flow)
15. `backend/services/project.service.ts` — budget computation, status transitions
16. `backend/controllers/project.controller.ts`
17. `backend/routes/project.routes.ts`
18. `backend/services/proposal.service.ts` — accept logic (assign freelancer, auto-reject others)
19. `backend/controllers/proposal.controller.ts`
20. `backend/routes/proposal.routes.ts`

### Phase 5: Milestones, Disputes, Reviews
21. `backend/controllers/milestone.controller.ts`
22. `backend/routes/milestone.routes.ts`
23. `backend/controllers/dispute.controller.ts`
24. `backend/routes/dispute.routes.ts`
25. `backend/controllers/review.controller.ts`
26. `backend/routes/review.routes.ts`

### Phase 6: Admin (all admin functionality)
27. `backend/services/admin.service.ts` — dashboard aggregations, abandoned project detection
28. `backend/controllers/admin.controller.ts` — login, dashboard, disputes, recovery, users, NFTs
29. `backend/routes/admin.routes.ts` — all admin endpoints under one router

### Phase 7: App Entry Point
30. `backend/index.ts` — Wire everything, CORS, rate limiting, cookie parser, route mounting
31. `backend/check-db.ts` — Health check utility

---

## 6. Security Considerations

- **Dual JWT secrets** — `JWT_SECRET` for users, `JWT_ADMIN_SECRET` for admins, different cookie names (`stxworx_token` vs `stxworx_admin_token`)
- **Rate limiting** on auth endpoints and all write operations
- **Input validation** with Zod on every request body
- **SQL injection protection** via Drizzle ORM parameterized queries
- **CORS** configured for frontend origin only
- **httpOnly + secure + sameSite cookies** for JWT storage
- **Role enforcement** — clients cannot access freelancer-only endpoints and vice versa
- **Ownership checks** — clients can only modify their own projects, freelancers their own proposals
- **Admin isolation** — admin routes use entirely separate middleware, separate JWT, separate table
- **No secrets in responses** — strip password_hash and internal fields before returning
- **Wallet signature verification** — prevents impersonation, uses `@stacks/encryption`

---

## 7. Environment Variables

```
DATABASE_URL          # MySQL connection string
JWT_SECRET            # Signing secret for user (wallet) JWTs
JWT_ADMIN_SECRET      # Signing secret for admin JWTs (must be different from JWT_SECRET)
NODE_ENV              # 'development' or 'production'
PORT                  # Server port (default: 5001)
CORS_ORIGIN           # Frontend URL for CORS (default: http://localhost:5173)
```

---

## 8. Dependencies to Add

```
@stacks/encryption    # For verifyMessageSignatureRsv (wallet signature verification)
```

All other required packages are already in `package.json`.
