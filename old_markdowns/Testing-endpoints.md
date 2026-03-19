# STXWORX API — Endpoint Testing Guide

> **Base URL:** `http://localhost:5001`
> **Tools:** Use `curl`, Postman, or any HTTP client.
> Cookies are set automatically by the server (httpOnly). With `curl`, use `-c cookies.txt -b cookies.txt` to persist cookies across requests.

---

## Prerequisites

1. MySQL running with `DATABASE_URL` set
2. Push the schema and seed the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

---

## 1. Categories (Public)

### 1.1 Get all categories
```bash
curl http://localhost:5001/api/categories
```
**Expected:** Array of 7 categories, each with `id`, `name`, `icon`, `subcategories[]`.

---

## 2. Admin Auth

### 2.1 Admin login
```bash
curl -X POST http://localhost:5001/api/admin/login \
  -H "Content-Type: application/json" \
  -c admin-cookies.txt \
  -d '{"username": "admin", "password": "SuperSecretAdminPassword123!"}'
```
**Expected:** `{"message": "Login successful", "admin": {"id": 1, "username": "admin"}}` + `stxworx_admin_token` cookie set.

### 2.2 Admin get me
```bash
curl http://localhost:5001/api/admin/me \
  -b admin-cookies.txt
```
**Expected:** `{"admin": {"id": 1, "username": "admin", "createdAt": "..."}}`

### 2.3 Admin logout
```bash
curl -X POST http://localhost:5001/api/admin/logout \
  -b admin-cookies.txt -c admin-cookies.txt
```
**Expected:** `{"message": "Logout successful"}` + cookie cleared.

---

## 3. User Auth (Wallet-Based)

> Wallet auth requires a valid Stacks signed message. For local testing, you can **temporarily bypass** signature verification by modifying `auth.service.ts` to skip the `verifyMessageSignatureRsv` check, or use a real Stacks wallet to generate signatures.

### 3.1 Verify wallet — Register as CLIENT
```bash
curl -X POST http://localhost:5001/api/auth/verify-wallet \
  -H "Content-Type: application/json" \
  -c client-cookies.txt \
  -d '{
    "stxAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    "publicKey": "<valid-public-key>",
    "signature": "<valid-signature>",
    "message": "Sign in to STXWORX",
    "role": "client"
  }'
```
**Expected:** `{"message": "Login successful", "user": {"id": 1, "stxAddress": "ST1PQ...", "username": null, "role": "client"}}`

### 3.2 Verify wallet — Register as FREELANCER
```bash
curl -X POST http://localhost:5001/api/auth/verify-wallet \
  -H "Content-Type: application/json" \
  -c freelancer-cookies.txt \
  -d '{
    "stxAddress": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    "publicKey": "<valid-public-key>",
    "signature": "<valid-signature>",
    "message": "Sign in to STXWORX",
    "role": "freelancer"
  }'
```
**Expected:** User created with `role: "freelancer"`.

### 3.3 Get current user
```bash
curl http://localhost:5001/api/auth/me \
  -b client-cookies.txt
```
**Expected:** Current user profile.

### 3.4 Logout
```bash
curl -X POST http://localhost:5001/api/auth/logout \
  -b client-cookies.txt -c client-cookies.txt
```
**Expected:** `{"message": "Logout successful"}`

### 3.5 Verify unauthenticated access is blocked
```bash
curl http://localhost:5001/api/auth/me
```
**Expected:** `401 {"message": "Authentication required"}`

---

## 4. Users

### 4.1 Get user by STX address (public)
```bash
curl http://localhost:5001/api/users/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
```
**Expected:** User public profile.

### 4.2 Update own profile
```bash
curl -X PATCH http://localhost:5001/api/users/me \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"username": "alice_client"}'
```
**Expected:** Updated user with `"username": "alice_client"`.

### 4.3 Get reviews for a user (public)
```bash
curl http://localhost:5001/api/users/ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM/reviews
```
**Expected:** Empty array `[]` (no reviews yet).

---

## 5. Projects

### 5.1 Create project (client only)
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{
    "title": "Build a DeFi Dashboard",
    "description": "Full-stack dApp with Stacks integration",
    "category": "Development & Tech",
    "subcategory": "dApp Development",
    "tokenType": "STX",
    "numMilestones": 2,
    "milestone1Title": "Frontend UI",
    "milestone1Amount": "50000000",
    "milestone2Title": "Smart Contract Integration",
    "milestone2Amount": "50000000"
  }'
```
**Expected:** `201` with the created project object. Note the `id` for later steps.

### 5.2 Freelancer tries to create project (should fail)
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{"title": "Test", "description": "Test", "category": "AI & Automation", "tokenType": "STX", "numMilestones": 1, "milestone1Title": "M1", "milestone1Amount": "1000000"}'
```
**Expected:** `403 {"message": "Only clients can perform this action"}`

### 5.3 Browse open projects (public)
```bash
curl "http://localhost:5001/api/projects"
```
**Expected:** Array of open projects with computed `budget` field.

### 5.4 Browse with filters
```bash
curl "http://localhost:5001/api/projects?category=Development%20%26%20Tech&tokenType=STX"
```
**Expected:** Filtered results.

### 5.5 Get project by ID
```bash
curl http://localhost:5001/api/projects/1
```
**Expected:** Full project details with `budget`.

### 5.6 Update project (client owner, while open)
```bash
curl -X PATCH http://localhost:5001/api/projects/1 \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"title": "Build a DeFi Dashboard v2"}'
```
**Expected:** Updated project.

### 5.7 Get my posted projects
```bash
curl http://localhost:5001/api/projects/my/posted \
  -b client-cookies.txt
```
**Expected:** Array of projects posted by this client.

### 5.8 Get my active projects
```bash
curl http://localhost:5001/api/projects/my/active \
  -b client-cookies.txt
```
**Expected:** Empty array (no active projects yet).

### 5.9 Cancel project (client owner, while open)
> Create a second project first to test cancellation without affecting the main flow.
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{
    "title": "Temporary Project",
    "description": "Will be cancelled",
    "category": "AI & Automation",
    "tokenType": "sBTC",
    "numMilestones": 1,
    "milestone1Title": "Only milestone",
    "milestone1Amount": "10000000"
  }'
```
Then cancel it:
```bash
curl -X DELETE http://localhost:5001/api/projects/2 \
  -b client-cookies.txt
```
**Expected:** Project with `status: "cancelled"`.

---

## 6. Proposals

### 6.1 Submit proposal (freelancer only)
```bash
curl -X POST http://localhost:5001/api/proposals \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{
    "projectId": 1,
    "coverLetter": "I have 3 years of experience building Stacks dApps. I would love to work on this project."
  }'
```
**Expected:** `201` with proposal object. Note the `id`.

### 6.2 Client tries to submit proposal (should fail)
```bash
curl -X POST http://localhost:5001/api/proposals \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"projectId": 1, "coverLetter": "Test"}'
```
**Expected:** `403 {"message": "Only freelancers can perform this action"}`

### 6.3 Duplicate proposal (should fail)
```bash
curl -X POST http://localhost:5001/api/proposals \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{"projectId": 1, "coverLetter": "Another attempt"}'
```
**Expected:** `409 {"message": "You have already submitted a proposal for this project"}`

### 6.4 Get proposals for a project (client owner)
```bash
curl http://localhost:5001/api/proposals/project/1 \
  -b client-cookies.txt
```
**Expected:** Array with the freelancer's proposal.

### 6.5 Get my proposals (freelancer)
```bash
curl http://localhost:5001/api/proposals/my \
  -b freelancer-cookies.txt
```
**Expected:** Array of proposals submitted by this freelancer.

### 6.6 Reject a proposal (client)
> Register a second freelancer and submit another proposal first to test rejection.
```bash
curl -X PATCH http://localhost:5001/api/proposals/1/reject \
  -b client-cookies.txt
```
**Expected:** Proposal with `status: "rejected"`.

### 6.7 Withdraw a proposal (freelancer)
```bash
curl -X PATCH http://localhost:5001/api/proposals/1/withdraw \
  -b freelancer-cookies.txt
```
**Expected:** Proposal with `status: "withdrawn"`.

### 6.8 Accept proposal (client)
> Submit a fresh proposal first if needed.
```bash
curl -X PATCH http://localhost:5001/api/proposals/1/accept \
  -b client-cookies.txt
```
**Expected:** Proposal with `status: "accepted"`. Freelancer is now assigned to the project. Other pending proposals auto-rejected.

### 6.9 Activate project (after on-chain escrow)
> After the frontend triggers the wallet escrow tx and it confirms:
```bash
curl -X PATCH http://localhost:5001/api/projects/1/activate \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{
    "escrowTxId": "0xabc123def456...",
    "onChainId": 1
  }'
```
**Expected:** Project with `status: "active"`, `escrowTxId` and `onChainId` set.

---

## 7. Milestones

### 7.1 Submit milestone deliverable (freelancer)
```bash
curl -X POST http://localhost:5001/api/milestones/submit \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{
    "projectId": 1,
    "milestoneNum": 1,
    "deliverableUrl": "https://github.com/user/repo/pull/1",
    "description": "Frontend UI completed with all screens",
    "completionTxId": "0xmilestone1txhash..."
  }'
```
**Expected:** `201` with milestone submission object. Note the `id`.

### 7.2 Get milestone submissions for a project
```bash
curl http://localhost:5001/api/milestones/project/1 \
  -b client-cookies.txt
```
**Expected:** Array with the submission.

### 7.3 Reject milestone (client)
```bash
curl -X PATCH http://localhost:5001/api/milestones/1/reject \
  -b client-cookies.txt
```
**Expected:** Submission with `status: "rejected"`. Freelancer must resubmit.

### 7.4 Resubmit milestone (freelancer)
```bash
curl -X POST http://localhost:5001/api/milestones/submit \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{
    "projectId": 1,
    "milestoneNum": 1,
    "deliverableUrl": "https://github.com/user/repo/pull/2",
    "description": "Addressed review feedback"
  }'
```
**Expected:** `201` new submission created.

### 7.5 Approve milestone (client)
```bash
curl -X PATCH http://localhost:5001/api/milestones/2/approve \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"releaseTxId": "0xrelease1txhash..."}'
```
**Expected:** Submission with `status: "approved"`, `releaseTxId` set.

### 7.6 Submit and approve milestone 2 (repeat flow)
```bash
# Freelancer submits milestone 2
curl -X POST http://localhost:5001/api/milestones/submit \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{
    "projectId": 1,
    "milestoneNum": 2,
    "deliverableUrl": "https://github.com/user/repo/pull/3",
    "description": "Smart contract integration complete",
    "completionTxId": "0xmilestone2txhash..."
  }'

# Client approves milestone 2
curl -X PATCH http://localhost:5001/api/milestones/3/approve \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"releaseTxId": "0xrelease2txhash..."}'
```
**Expected:** After all milestones are approved, project status automatically moves to `"completed"`.

### 7.7 Verify project is completed
```bash
curl http://localhost:5001/api/projects/1
```
**Expected:** `status: "completed"`.

---

## 8. Disputes

> Start a new project flow (steps 5-6) to test disputes on an active project.

### 8.1 File a dispute (client or freelancer)
```bash
curl -X POST http://localhost:5001/api/disputes \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{
    "projectId": 2,
    "milestoneNum": 1,
    "reason": "Freelancer delivered incomplete work that does not match requirements",
    "evidenceUrl": "https://drive.google.com/evidence-doc",
    "disputeTxId": "0xdisputetxhash..."
  }'
```
**Expected:** `201` with dispute object. Project status changes to `"disputed"`.

### 8.2 Get disputes for a project
```bash
curl http://localhost:5001/api/disputes/project/2 \
  -b client-cookies.txt
```
**Expected:** Array with the filed dispute.

### 8.3 Dispute on non-active project (should fail)
```bash
curl -X POST http://localhost:5001/api/disputes \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"projectId": 1, "milestoneNum": 1, "reason": "Test"}'
```
**Expected:** `400 {"message": "Can only dispute active projects"}` (project 1 is completed).

---

## 9. Reviews

> Only works on completed projects.

### 9.1 Leave a review (client reviews freelancer)
```bash
curl -X POST http://localhost:5001/api/reviews \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{
    "projectId": 1,
    "revieweeId": 2,
    "rating": 5,
    "comment": "Excellent work, delivered on time with great quality!"
  }'
```
**Expected:** `201` with review object.

### 9.2 Leave a review (freelancer reviews client)
```bash
curl -X POST http://localhost:5001/api/reviews \
  -H "Content-Type: application/json" \
  -b freelancer-cookies.txt \
  -d '{
    "projectId": 1,
    "revieweeId": 1,
    "rating": 4,
    "comment": "Good client, clear requirements. Payment was prompt."
  }'
```
**Expected:** `201` with review object.

### 9.3 Duplicate review (should fail)
```bash
curl -X POST http://localhost:5001/api/reviews \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"projectId": 1, "revieweeId": 2, "rating": 3, "comment": "Changed my mind"}'
```
**Expected:** `409 {"message": "You have already reviewed this project"}`

### 9.4 Review on non-completed project (should fail)
```bash
curl -X POST http://localhost:5001/api/reviews \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"projectId": 2, "revieweeId": 2, "rating": 3}'
```
**Expected:** `400 {"message": "Can only review completed projects"}`

### 9.5 Self-review (should fail)
```bash
curl -X POST http://localhost:5001/api/reviews \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"projectId": 1, "revieweeId": 1, "rating": 5}'
```
**Expected:** `400 {"message": "Cannot review yourself"}`

### 9.6 Verify reviews appear on user profile
```bash
curl http://localhost:5001/api/users/ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG/reviews
```
**Expected:** Array with the review(s) for that freelancer.

---

## 10. Admin — Dashboard

### 10.1 Get dashboard stats
```bash
curl http://localhost:5001/api/admin/dashboard \
  -b admin-cookies.txt
```
**Expected:** `{"totalUsers": N, "totalProjects": N, "activeProjects": N, "openDisputes": N}`

---

## 11. Admin — Projects

### 11.1 Get all projects (no ownership filter)
```bash
curl http://localhost:5001/api/admin/projects \
  -b admin-cookies.txt
```
**Expected:** All projects regardless of status.

### 11.2 Filter projects
```bash
curl "http://localhost:5001/api/admin/projects?status=active&search=DeFi" \
  -b admin-cookies.txt
```
**Expected:** Filtered results.

### 11.3 Get project detail with submissions and disputes
```bash
curl http://localhost:5001/api/admin/projects/1 \
  -b admin-cookies.txt
```
**Expected:** `{"project": {...}, "submissions": [...], "disputes": [...]}`

---

## 12. Admin — Disputes

### 12.1 Get all open disputes
```bash
curl http://localhost:5001/api/admin/disputes \
  -b admin-cookies.txt
```
**Expected:** Array of disputes with `status: "open"`.

### 12.2 Resolve a dispute
```bash
curl -X PATCH http://localhost:5001/api/admin/disputes/1/resolve \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "resolution": "After reviewing evidence, releasing funds to freelancer",
    "resolutionTxId": "0xadminresolvetxhash..."
  }'
```
**Expected:** Dispute with `status: "resolved"`, `resolvedBy`, `resolvedAt` set.

### 12.3 Reset a dispute (milestone reset)
```bash
curl -X PATCH http://localhost:5001/api/admin/disputes/1/reset \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "resolution": "Milestone needs to be redone. Resetting for resubmission.",
    "resolutionTxId": "0xadminresettxhash..."
  }'
```
**Expected:** Dispute with `status: "reset"`.

---

## 13. Admin — Abandoned Project Recovery

### 13.1 Get abandoned projects
```bash
curl http://localhost:5001/api/admin/recovery/abandoned \
  -b admin-cookies.txt
```
**Expected:** Array of active projects with no updates in 7+ days (likely empty on fresh data).

### 13.2 Force release a milestone
```bash
curl -X PATCH http://localhost:5001/api/admin/recovery/force-release \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "projectId": 2,
    "milestoneNum": 1,
    "txId": "0xforcereleasetxhash..."
  }'
```
**Expected:** Milestone submission updated with `status: "approved"`, `releaseTxId` set.

### 13.3 Force refund a project
```bash
curl -X PATCH http://localhost:5001/api/admin/recovery/force-refund \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "projectId": 2,
    "txId": "0xforcerefundtxhash..."
  }'
```
**Expected:** Project with `status: "refunded"`.

---

## 14. Admin — Users

### 14.1 Get all users
```bash
curl http://localhost:5001/api/admin/users \
  -b admin-cookies.txt
```
**Expected:** Array of all users with their details.

### 14.2 Deactivate a user
```bash
curl -X PATCH http://localhost:5001/api/admin/users/2/status \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"isActive": false}'
```
**Expected:** User with `isActive: false`.

### 14.3 Reactivate a user
```bash
curl -X PATCH http://localhost:5001/api/admin/users/2/status \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"isActive": true}'
```
**Expected:** User with `isActive: true`.

---

## 15. Admin — NFT Releases

### 15.1 Create an NFT record
```bash
curl -X POST http://localhost:5001/api/admin/nfts \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{
    "recipientId": 2,
    "nftType": "top_freelancer",
    "name": "Top Freelancer Q1 2025",
    "description": "Awarded to the top-rated freelancer of Q1 2025",
    "metadataUrl": "https://ipfs.io/ipfs/Qm..."
  }'
```
**Expected:** `201` with NFT record. `minted: false`.

### 15.2 List all NFTs
```bash
curl http://localhost:5001/api/admin/nfts \
  -b admin-cookies.txt
```
**Expected:** Array with the created NFT.

### 15.3 Filter NFTs
```bash
curl "http://localhost:5001/api/admin/nfts?nftType=top_freelancer&minted=false" \
  -b admin-cookies.txt
```
**Expected:** Filtered results.

### 15.4 Confirm NFT mint (after on-chain mint)
```bash
curl -X PATCH http://localhost:5001/api/admin/nfts/1/confirm-mint \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"mintTxId": "0xnftminttxhash..."}'
```
**Expected:** NFT with `minted: true`, `mintTxId` set.

### 15.5 Get NFTs for a specific user
```bash
curl http://localhost:5001/api/admin/nfts/user/2 \
  -b admin-cookies.txt
```
**Expected:** Array of NFTs issued to user 2.

---

## 16. Error Cases to Verify

### 16.1 Unauthenticated access to protected route
```bash
curl http://localhost:5001/api/projects/my/posted
```
**Expected:** `401 {"message": "Authentication required"}`

### 16.2 User tries admin route
```bash
curl http://localhost:5001/api/admin/dashboard \
  -b client-cookies.txt
```
**Expected:** `401 {"message": "Admin authentication required"}`

### 16.3 Admin cookie on user route
```bash
curl http://localhost:5001/api/auth/me \
  -b admin-cookies.txt
```
**Expected:** `401 {"message": "Authentication required"}` (different cookie names and JWT secrets).

### 16.4 Cancel a non-open project
```bash
curl -X DELETE http://localhost:5001/api/projects/1 \
  -b client-cookies.txt
```
**Expected:** `400 {"message": "Can only cancel open projects"}` (project 1 is already completed).

### 16.5 Invalid project ID
```bash
curl http://localhost:5001/api/projects/abc
```
**Expected:** `400 {"message": "Invalid project ID"}`

### 16.6 Non-existent resource
```bash
curl http://localhost:5001/api/projects/99999
```
**Expected:** `404 {"message": "Project not found"}`

### 16.7 Rate limiting
```bash
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5001/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "wrong"}'
done
```
**Expected:** First 5 return `401`, then `429` (Too many login attempts).

### 16.8 Invalid JSON body
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d 'not valid json'
```
**Expected:** `400` error.

### 16.9 Missing required fields
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b client-cookies.txt \
  -d '{"title": "Only a title"}'
```
**Expected:** `400 {"message": "Validation error", "errors": [...]}` with Zod validation details.

---

## Full Happy Path (End-to-End Order)

1. **Seed DB:** `npm run db:push && npm run db:seed`
2. **Get categories** (step 1.1) — verify seed worked
3. **Admin login** (step 2.1)
4. **Client registers** via wallet (step 3.1)
5. **Freelancer registers** via wallet (step 3.2)
6. **Client updates profile** (step 4.2)
7. **Client creates project** (step 5.1)
8. **Freelancer submits proposal** (step 6.1)
9. **Client views proposals** (step 6.4)
10. **Client accepts proposal** (step 6.8) — freelancer assigned, others auto-rejected
11. **Client activates project** after escrow (step 6.9) — status becomes "active"
12. **Freelancer submits milestone 1** (step 7.1)
13. **Client rejects milestone 1** (step 7.3) — freelancer resubmits
14. **Freelancer resubmits milestone 1** (step 7.4)
15. **Client approves milestone 1** (step 7.5)
16. **Freelancer submits milestone 2** (step 7.6)
17. **Client approves milestone 2** (step 7.6) — project auto-completes
18. **Verify project completed** (step 7.7)
19. **Client reviews freelancer** (step 9.1)
20. **Freelancer reviews client** (step 9.2)
21. **Admin checks dashboard** (step 10.1)
22. **Admin views project detail** (step 11.3)
23. **Admin issues NFT** to freelancer (step 15.1)
24. **Admin confirms mint** (step 15.4)
