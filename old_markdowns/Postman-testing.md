# STXWORX Postman Testing Guide

This guide provides a structured approach for testing the STXWORX API using Postman.

## 1. Environment Setup

Create a new Environment in Postman and add the following variable:
- `base_url`: `http://localhost:5001`

---

## 2. Authentication & Cookie Handling

Postman handles cookies automatically. When you log in as an Admin or User, the server sets a `httpOnly` secure cookie. Postman will store this and include it in subsequent requests to the same domain.

> **Note:** Because Admin and User authentication use different cookie names (`stxworx_admin_token` vs `stxworx_token`), you can be logged in as both simultaneously, but most endpoints require a specific role.

---

## 3. Categories (Public)

### Get All Categories
- **Method:** `GET`
- **URL:** `{{base_url}}/api/categories`
- **Description:** Returns the list of project categories.

---

## 4. Admin Flow

### 4.1 Admin Authentication
#### Login
- **Method:** `POST`
- **URL:** `{{base_url}}/api/admin/login`
- **Body (JSON):**
  ```json
  {
    "username": "admin",
    "password": "SuperSecretAdminPassword123!"
  }
  ```

#### Get Current Admin (Check Session)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/admin/me`

#### Logout
- **Method:** `POST`
- **URL:** `{{base_url}}/api/admin/logout`

### 4.2 Admin Management
#### Dashboard Stats
- **Method:** `GET`
- **URL:** `{{base_url}}/api/admin/dashboard`

#### View All Users
- **Method:** `GET`
- **URL:** `{{base_url}}/api/admin/users`

#### Resolve Dispute (Release Funds)
- **Method:** `PATCH`
- **URL:** `{{base_url}}/api/admin/disputes/:id/resolve`
- **Body (JSON):**
  ```json
  {
    "resolution": "Evidence reviewed. Releasing funds to freelancer.",
    "resolutionTxId": "0xadmin_resolution_tx"
  }
  ```

---

## 5. Client Flow

### 5.1 User Authentication (Wallet Setup)
#### Verify Wallet & Login
- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/verify-wallet`
- **Body (JSON):**
  ```json
  {
    "stxAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    "publicKey": "03...",
    "signature": "...",
    "message": "Sign in to STXWORX",
    "role": "client"
  }
  ```
  *(Note: Signature verification might need to be bypassed in `auth.service.ts` for strictly local API testing without a wallet extension.)*

### 5.2 Project Management
#### Create New Project (Escrow)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/projects`
- **Body (JSON):**
  ```json
  {
    "title": "Build a Clarity Smart Contract",
    "description": "Need a multi-signature wallet contract",
    "category": "Development & Tech",
    "subcategory": "Smart Contracts",
    "tokenType": "STX",
    "numMilestones": 2,
    "milestone1Title": "Design & Logic",
    "milestone1Amount": "25000000",
    "milestone2Title": "Deployment & Testing",
    "milestone2Amount": "25000000"
  }
  ```

#### Accept a Proposal
- **Method:** `PATCH`
- **URL:** `{{base_url}}/api/proposals/:id/accept`

#### Activate Project (After Escrow Deployment)
- **Method:** `PATCH`
- **URL:** `{{base_url}}/api/projects/:id/activate`
- **Body (JSON):**
  ```json
  {
    "escrowTxId": "0xescrow_deployment_tx_hash",
    "onChainId": 1
  }
  ```

#### Approve Milestone & Release Payment
- **Method:** `PATCH`
- **URL:** `{{base_url}}/api/milestones/:id/approve`
- **Body (JSON):**
  ```json
  {
    "releaseTxId": "0xrelease_payment_tx_hash"
  }
  ```

---

## 6. Freelancer Flow

### 6.1 User Authentication
#### Verify Wallet & Login
- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/verify-wallet`
- **Body (JSON):**
  ```json
  {
    "stxAddress": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
    "publicKey": "02...",
    "signature": "...",
    "message": "Sign in to STXWORX",
    "role": "freelancer"
  }
  ```

### 6.2 Working on Projects
#### Submit Proposal
- **Method:** `POST`
- **URL:** `{{base_url}}/api/proposals`
- **Body (JSON):**
  ```json
  {
    "projectId": 1,
    "coverLetter": "I have extensive experience with Clarity and Stacks."
  }
  ```

#### Submit Milestone Deliverable
- **Method:** `POST`
- **URL:** `{{base_url}}/api/milestones/submit`
- **Body (JSON):**
  ```json
  {
    "projectId": 1,
    "milestoneNum": 1,
    "deliverableUrl": "https://github.com/myrepo/submission",
    "description": "Milestone 1 is complete. Please review deliverables.",
    "completionTxId": "0xmilestone_completion_tx"
  }
  ```

---

## 7. Reviews

### Post a Review
- **Method:** `POST`
- **URL:** `{{base_url}}/api/reviews`
- **Body (JSON):**
  ```json
  {
    "projectId": 1,
    "revieweeId": 2,
    "rating": 5,
    "comment": "Great experience working together!"
  }
  ```

---

## 8. Tips for Postman Success

1.  **Capture ID Values:** After creating a project or proposal, copy the `id` from the response and use it in the `:id` portion of the next URL (e.g., `{{base_url}}/api/proposals/5/accept`).
2.  **Order Matters:** Follow the "Happy Path" order: Login -> Create Project -> Submit Proposal -> Accept Proposal -> Activate Project -> Submit Milestone -> Approve Milestone -> Review.
3.  **Check Headers:** Ensure `Content-Type: application/json` is set for all POST and PATCH requests.
