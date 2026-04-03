# STXWORX

STXWORX is a Stacks-based freelance marketplace with on-chain escrow, milestone releases, admin moderation, social identity, and reputation features. The current product flow is: create a project, receive proposals, fund escrow on-chain, verify the escrow transaction, activate the project, and then manage milestone delivery and releases.

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url>
cd stxworx-8.0
npm install

# 2. Start local services if needed
docker compose up -d

# 3. Configure environment
cp .env.example .env

# 4. Initialize the database
npm run db:setup

# 5. Run the app stack
npm run dev
```

The app is served at `http://localhost:5000` and the API is available under `http://localhost:5000/api`.

---

## 🌟 Features

- **Escrow-first project funding**: Clients create projects off-chain and fund them on-chain when accepting a proposal.
- **Multi-token support**: Escrow creation and releases support STX, sBTC, and USDCx.
- **Milestone delivery workflow**: Freelancers submit deliverables, clients approve releases, and disputes can be raised when work stalls.
- **Marketplace roles**: Wallet-authenticated client and freelancer flows with admin moderation.
- **Social identity and reputation**: Profiles, social posts, reviews, badges, and reputation contract integrations.
- **Canonical activation flow**: Proposal acceptance verifies the escrow contract call and activates the project in one path.

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **TanStack Query** for data fetching and caching
- **react-router-dom** for client-side routing
- **Tailwind CSS** with custom theme
- **Radix UI** for accessible components
- **Stacks Connect** for wallet integration

### Backend
- **Express.js** server with TypeScript
- **MySQL** database
- **Drizzle ORM** for type-safe database queries
- **Express Session** for authentication

### Blockchain
- **Clarity** smart contracts on Stacks
- **Clarinet** for contract development and testing
- Escrow contract: **`escrow-multi-token-v11.clar`**
- Reputation contracts: **`rep-sft.clar`**, **`stxworx-badge.clar`**, **`verify-soulbound.clar`**

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18+
   ```

2. **npm** or **pnpm**
   ```bash
   npm --version
   ```

3. **MySQL** (v8.0 or higher)
   - For local development: [Download MySQL](https://dev.mysql.com/downloads/mysql/)
   - Or use a cloud MySQL provider (PlanetScale, Aiven, etc.)

4. **Clarinet** (for smart contract development)
   ```bash
   # Install Clarinet
   # Windows (using Winget):
   winget install clarinet
   
   # macOS (using Homebrew):
   brew install clarinet
   
   # Linux:
   curl -L https://github.com/hirosystems/clarinet/releases/download/v2.0.0/clarinet-linux-x64.tar.gz | tar xz
   
   # Verify installation
   clarinet --version
   ```

5. **Stacks Wallet**
   - Install [Hiro Wallet](https://wallet.hiro.so/) browser extension
   - Create or import a wallet that matches your configured `VITE_STACKS_NETWORK`

---

## 🚀 Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd stxworx-8.0
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Database Setup

#### Option A: Local MySQL

1. Create a database:
   ```bash
   mysql -u root -p
   CREATE DATABASE stx_freelance;
   exit
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database credentials:
   ```env
   DATABASE_URL=mysql://root:yourpassword@localhost:3306/stx_freelance
   SESSION_SECRET=your-random-secret-key-here-min-32-chars
   ```

#### Option B: Cloud MySQL (PlanetScale, Aiven, etc.)

1. Provision a MySQL database on your chosen provider.
2. Copy the connection string (URI format).
3. Update `.env`:
   ```env
   DATABASE_URL=mysql://user:pass@host:3306/dbname
   SESSION_SECRET=your-random-secret-key-here-min-32-chars
   ```

### Step 4: Initialize Database

```bash
# Push schema to database
npm run db:push

# Seed with initial data (optional)
npm run db:seed

# Or do both at once
npm run db:setup
```

### Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api

---

## 🔗 Smart Contract Development

### Understanding the Contract

The platform uses `contracts/escrow-multi-token-v11.clar` as the active escrow contract. It supports:
- **STX**: Native Stacks token (6 decimal places)
- **sBTC**: Bitcoin on Stacks (8 decimal places)
- **USDCx**: SIP-010 token support for escrow creation and release

Proposal acceptance is tied to this contract. The frontend opens the wallet transaction first, then the backend verifies the confirmed contract call through the Hiro API before marking the project active.

### Testing Contracts Locally

1. **Start Clarinet Console**:
   ```bash
   clarinet console
   ```

2. **Test Contract Functions**:
   ```clarity
   ;; Create a test project escrow with STX
   (contract-call? .escrow-multi-token-v11 create-project-stx
     'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
     u15000000
     u15000000
     u15000000
     u15000000
   )
   
   ;; Release milestone 1 for an STX-funded project
   (contract-call? .escrow-multi-token-v11 release-milestone-stx u1 u1)

   ;; Create a test project escrow with sBTC
   (contract-call? .escrow-multi-token-v11 create-project-sbtc
     'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
     u50000000
     u50000000
     u0
     u0
     .sbtc-token
   )
   ```

3. **Run Test Suite**:
   ```bash
   clarinet test
   ```

---

## 🌐 Deployment Configuration

### Step 1: Configure Clarinet and app environment

1. **Confirm `Clarinet.toml`** points at the active escrow contract:
   ```toml
   [project]
   name = "stxworx-8"
   
   [contracts.escrow-multi-token-v11]
   path = "contracts/escrow-multi-token-v11.clar"
   clarity_version = 4
   epoch = "latest"
   ```

2. **Set the matching environment values** in `.env`:
   ```env
   VITE_STACKS_NETWORK=mainnet
   VITE_CONTRACT_ADDRESS=SP37JRPTQ0KFMB3HAFVCCAWDQWHKRJCGBW1W19TJH
   VITE_ESCROW_CONTRACT_NAME=escrow-multi-token-v11
   VITE_HIRO_API_BASE_URL=https://api.hiro.so
   ```

3. **Adjust the deployment manifest** when targeting a different network:
   ```yaml
   ---
   id: 0
   name: Escrow Multi-Token Contract
   network: mainnet
   stacks-node: "https://api.hiro.so"
   contracts:
     - contract-publish:
         contract-name: escrow-multi-token-v11
         expected-sender: SP37JRPTQ0KFMB3HAFVCCAWDQWHKRJCGBW1W19TJH
         cost: 50000
         path: contracts/escrow-multi-token-v11.clar
         clarity-version: 4
         epoch: latest
   ```

### Step 2: Deploy and verify

1. **Check Contract Syntax**:
   ```bash
   clarinet check
   ```

2. **Deploy Using Clarinet**:
   ```bash
   clarinet deployments apply --manifest ./deployments/default.mainnet-plan.yaml
   ```

3. **Check the contract on Explorer**:
   - Visit the appropriate Hiro Explorer for your configured network
   - Search for your contract address
   - Verify contract is deployed and callable

4. **Inspect the published contract**:
   ```bash
   # Read contract source
   clarinet contracts describe escrow-multi-token-v11 --mainnet
   
   # Check contract functions
   clarinet contracts functions escrow-multi-token-v11 --mainnet
   ```

---

## 🎯 Usage Guide

### For Clients (Creating Projects)

1. **Connect Wallet**:
   - Click "Connect Wallet" in navigation
   - Approve connection in Hiro Wallet

2. **Create Project**:
   - Post a project from the client flow
   - Fill in project details:
     - **Title**: Project name
     - **Category**: Type of work
     - **Token Type**: STX, sBTC, or USDCx
     - **Milestones**: 1 to 4 milestone titles and amounts
     - **Description**: Project requirements

3. **Accept a proposal and fund escrow**:
   - Review incoming proposals for the project
   - Use the proposal payment action to open the wallet
   - Submit the escrow `create-project-*` transaction
   - Let the backend verify the confirmed transaction and activate the project

4. **Manage Milestones**:
   - View milestone progress
   - Review freelancer submissions
   - Release payments upon approval
   - Escalate disputes to admin tooling when needed

### For Freelancers (Completing Work)

1. **Connect Wallet**:
   - Use the same address shared with client

2. **View Projects**:
   - Browse open work and submit proposals
   - Track accepted and active projects from the freelancer flow

3. **Complete Milestones**:
   - Deliver work for each milestone
   - Submit deliverable links and milestone notes
   - Trigger the milestone completion step when required

4. **Receive Payments**:
   - Client reviews and releases payment
   - Funds are released from escrow to your wallet
   - Contract fee handling follows the active escrow contract configuration

---

## 📊 Token Decimal Handling

⚠️ **CRITICAL**: Different tokens use different decimal places!

### STX (Native Stacks Token)
- **Decimals**: 6
- **1 STX** = 1,000,000 microstacks
- Example: 60 STX = 60,000,000 microstacks

### sBTC (Bitcoin on Stacks)
- **Decimals**: 8
- **1 sBTC** = 100,000,000 micro-sBTC (satoshis)
- Example: 0.5 sBTC = 50,000,000 micro-sBTC

### Implementation

```typescript
// Helper function for decimal conversion
const getTokenDecimals = (tokenType: string): number => {
  return tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
};

// Converting to micro-units
const amount = 15; // User input
const tokenType = 'sBTC';
const microUnits = amount * getTokenDecimals(tokenType);
// Result: 15 * 100,000,000 = 1,500,000,000 micro-sBTC

// Converting to display amount
const displayAmount = microUnits / getTokenDecimals(tokenType);
// Result: 1,500,000,000 / 100,000,000 = 15 sBTC
```

---

## 🏗️ Project Structure

```
stxworx-8.0/
├── backend
│   ├── check-db.ts
│   ├── controllers
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── bounty.controller.ts
│   │   ├── category.controller.ts
│   │   ├── connections.controller.ts
│   │   ├── dispute.controller.ts
│   │   ├── messages.controller.ts
│   │   ├── milestone.controller.ts
│   │   ├── nft.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── project.controller.ts
│   │   ├── proposal.controller.ts
│   │   ├── review.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── social.controller.ts
│   │   └── user.controller.ts
│   ├── db.ts
│   ├── drizzle.config.ts
│   ├── index.ts
│   ├── middleware
│   │   ├── admin-auth.ts
│   │   ├── auth.ts
│   │   └── additional middleware utilities
│   ├── routes
│   │   ├── admin.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── bounty.routes.ts
│   │   ├── category.routes.ts
│   │   ├── connections.routes.ts
│   │   ├── dispute.routes.ts
│   │   ├── messages.routes.ts
│   │   ├── milestone.routes.ts
│   │   ├── nft.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── project.routes.ts
│   │   ├── proposal.routes.ts
│   │   ├── review.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── social.routes.ts
│   │   └── user.routes.ts
│   ├── seed.ts
│   ├── services
│   │   ├── admin-auth.service.ts
│   │   ├── admin.service.ts
│   │   ├── auth.service.ts
│   │   ├── bounty.service.ts
│   │   ├── connections.service.ts
│   │   ├── messages.service.ts
│   │   ├── nft.service.ts
│   │   ├── notification.service.ts
│   │   ├── platform-settings.service.ts
│   │   ├── project.service.ts
│   │   ├── proposal.service.ts
│   │   ├── settings.service.ts
│   │   └── social.service.ts
│   └── vite.ts
├── Clarinet.toml
├── client
│   ├── components.json
│   ├── fonts.zip
│   ├── index.html
│   ├── metadata.json
│   ├── package.json
│   ├── package-lock.json
│   ├── public
│   │   ├── 7.png
│   │   ├── Bronze NFT.png
│   │   ├── favicon.png
│   │   ├── fonts/
│   │   ├── Gold NFT.png
│   │   ├── Logo.png
│   │   ├── Platinum NFT.png
│   │   ├── Silver NFT.png
│   │   └── Verify NFT.png
│   ├── README.md
│   ├── refactor2.ts
│   ├── refactor3.ts
│   ├── refactor.ts
│   ├── src
│   │   ├── App.tsx
│   │   ├── components
│   │   │   ├── admin
│   │   │   │   ├── AdminApprovals.tsx
│   │   │   │   ├── AdminChats.tsx
│   │   │   │   ├── AdminJobsQueue.tsx
│   │   │   │   ├── AdminNFTRelease.tsx
│   │   │   │   ├── AdminOverview.tsx
│   │   │   │   ├── AdminSupport.tsx
│   │   │   │   └── AdminUsers.tsx
│   │   │   ├── bounty
│   │   │   │   ├── BountyCard.tsx
│   │   │   │   ├── BountyFilters.tsx
│   │   │   │   ├── BountyTypeSelector.tsx
│   │   │   │   ├── PayoutPanel.tsx
│   │   │   │   └── SubmissionList.tsx
│   │   │   ├── contract
│   │   │   │   ├── ApproveReleaseButton.tsx
│   │   │   │   ├── DisputeButton.tsx
│   │   │   │   ├── EscrowFundButton.tsx
│   │   │   │   ├── MilestoneCard.tsx
│   │   │   │   ├── MilestoneTracker.tsx
│   │   │   │   ├── SubmitWorkForm.tsx
│   │   │   │   └── TransactionHistory.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── ActiveContractCard.tsx
│   │   │   │   ├── EarningsChart.tsx
│   │   │   │   ├── EscrowOverview.tsx
│   │   │   │   ├── NotificationFeed.tsx
│   │   │   │   └── StatsRow.tsx
│   │   │   ├── dispute
│   │   │   │   ├── AdminResolutionPanel.tsx
│   │   │   │   ├── DisputeTimeline.tsx
│   │   │   │   └── EvidenceUploader.tsx
│   │   │   ├── escrow
│   │   │   │   ├── EscrowCard.tsx
│   │   │   │   ├── MilestoneTracker.tsx
│   │   │   │   └── TokenSelector.tsx
│   │   │   ├── freelancers
│   │   │   │   ├── FreelancerCard.tsx
│   │   │   │   └── FreelancerFilters.tsx
│   │   │   ├── jobs
│   │   │   │   ├── DeadlineCountdown.tsx
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobFilters.tsx
│   │   │   │   ├── JobSort.tsx
│   │   │   │   └── MilestoneBuilder.tsx
│   │   │   ├── layout
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── PageWrapper.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── leaderboard
│   │   │   │   ├── LeaderboardTable.tsx
│   │   │   │   ├── PodiumDisplay.tsx
│   │   │   │   └── RankHistoryChart.tsx
│   │   │   ├── nft
│   │   │   │   ├── BadgeCard.tsx
│   │   │   │   ├── NFTBadge.tsx
│   │   │   │   ├── NFTTooltip.tsx
│   │   │   │   └── VerifiedBadge.tsx
│   │   │   ├── profile
│   │   │   │   ├── CompletedJobsList.tsx
│   │   │   │   ├── NFTBadgeCollection.tsx
│   │   │   │   ├── ProfileHeader.tsx
│   │   │   │   ├── ReputationWidget.tsx
│   │   │   │   └── ReviewsList.tsx
│   │   │   ├── proposals
│   │   │   │   ├── AIProposalGenerator.tsx
│   │   │   │   ├── ProposalCard.tsx
│   │   │   │   ├── ProposalList.tsx
│   │   │   │   └── ProposalStatusBadge.tsx
│   │   │   ├── ui
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Textarea.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Tooltip.tsx
│   │   │   └── wallet
│   │   │       ├── ConnectWallet.tsx
│   │   │       ├── WalletBalanceDisplay.tsx
│   │   │       ├── WalletConnectButton.tsx
│   │   │       ├── WalletGuard.tsx
│   │   │       ├── WalletInfo.tsx
│   │   │       └── WalletProvider.tsx
│   │   ├── hooks
│   │   │   ├── useDispute.ts
│   │   │   ├── useEscrow.ts
│   │   │   ├── useLeaderboard.ts
│   │   │   ├── useMilestone.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useRole.ts
│   │   │   └── useWallet.ts
│   │   ├── index.css
│   │   ├── index.tsx
│   │   ├── lib
│   │   │   ├── api.ts
│   │   │   ├── constants.ts
│   │   │   ├── contracts.ts
│   │   │   ├── stacks.ts
│   │   │   └── utils.ts
│   │   ├── pages
│   │   │   ├── admin
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── DisputeManager.tsx
│   │   │   │   └── UserManager.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   ├── BountyBoardPage.tsx
│   │   │   ├── BountyDetailsPage.tsx
│   │   │   ├── client
│   │   │   │   ├── ClientDashboard.tsx
│   │   │   │   ├── CreateProject.tsx
│   │   │   │   ├── FundProject.tsx
│   │   │   │   ├── MilestoneApproval.tsx
│   │   │   │   └── ProjectDetail.tsx
│   │   │   ├── ContractPage.tsx
│   │   │   ├── DAOPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DisputePage.tsx
│   │   │   ├── ExploreFreelancersPage.tsx
│   │   │   ├── ExploreJobsPage.tsx
│   │   │   ├── freelancer
│   │   │   │   ├── ActiveProjects.tsx
│   │   │   │   ├── Earnings.tsx
│   │   │   │   ├── FreelancerDashboard.tsx
│   │   │   │   ├── MilestoneSubmit.tsx
│   │   │   │   └── ProjectWork.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── JobDetailsPage.tsx
│   │   │   ├── leaderboard
│   │   │   │   └── Leaderboard.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ManageBountiesPage.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   ├── MySubmissionsPage.tsx
│   │   │   ├── nft
│   │   │   │   └── BadgeGallery.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   ├── PostBountyPage.tsx
│   │   │   ├── PostJobPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ProPlanPage.tsx
│   │   │   ├── ProposalSubmitPage.tsx
│   │   │   ├── ReviewProposalsPage.tsx
│   │   │   ├── ReviewWorkPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── shared.tsx
│   │   ├── stores
│   │   │   ├── authStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   ├── projectStore.ts
│   │   │   ├── useAppStore.ts
│   │   │   ├── useContractStore.ts
│   │   │   ├── useJobStore.ts
│   │   │   ├── useLeaderboardStore.ts
│   │   │   └── useNotificationStore.ts
│   │   └── types
│   │       ├── bounty.ts
│   │       ├── contract.ts
│   │       ├── job.ts
│   │       ├── leaderboard.ts
│   │       ├── nft.ts
│   │       └── user.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── contracts
│   ├── escrow-multi-token.clar
│   ├── escrow-multi-token.tests.clar
│   ├── escrow-multi-token-v7.clar
│   ├── rep-sft.clar
│   ├── stxworks-escrow-v8.clar
│   ├── stxworx-badge.clar
│   └── verify-soulbound.clar
├── deployments
│   ├── default.devnet-plan.yaml
│   ├── default.simnet-plan.yaml
│   └── default.testnet-plan.yaml
├── dist
│   ├── backend
│   └── public
│       ├── assets
│       └── fonts
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
├── settings
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
├── shared
│   └── schema.ts
└── tsconfig.json
```

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start the Express app with Vite-served frontend

# Database
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with sample data
npm run db:setup         # Push schema + seed (one command)
npm run db:check         # Check database connection

# Build & Production
npm run build            # Build for production
npm run start            # Start production server
npm run check            # TypeScript type checking

# Smart Contracts
clarinet check           # Check contract syntax
clarinet test            # Run contract tests
clarinet console         # Start interactive console
clarinet deployments apply --manifest ./deployments/default.mainnet-plan.yaml   # Deploy using the mainnet manifest
```

---

## 🔒 Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Required)
DATABASE_URL=mysql://user:password@host:3306/database

# Session Secret (Required)
# Generate a secure random string (min 32 characters)
SESSION_SECRET=your-super-secret-key-here-make-it-random-and-long

# Node Environment (Optional - defaults shown)
NODE_ENV=development
PORT=5000
```

---

## 🧪 Testing

### Frontend Testing

```bash
# Run in development mode and test manually
npm run dev
```

### Smart Contract Testing

```bash
# Run all tests
clarinet test

# Or run the repo-level contract test script
npm test

# Interactive testing
clarinet console
```

### Manual Testing Checklist

- [ ] Connect wallet for the configured network
- [ ] Create STX project
- [ ] Create sBTC project
- [ ] Accept proposal and fund escrow
- [ ] Mark milestone complete (freelancer)
- [ ] Release milestone payment (client)
- [ ] Verify amounts display correctly
- [ ] Confirm escrow verification activates the project
- [ ] Test all 4 milestones
- [ ] Verify project completion

---

## 🚨 Common Issues & Troubleshooting

### Issue: "Database connection failed"
**Solution**: 
- Verify `DATABASE_URL` in `.env` is correct
- Ensure MySQL is running
- Check network connectivity to database

### Issue: "Contract not found"
**Solution**:
- Verify contract is deployed to the configured network
- Check `VITE_CONTRACT_ADDRESS` and `VITE_ESCROW_CONTRACT_NAME` in `.env`
- Ensure you're connected to the correct network in wallet

### Issue: "Post-condition failed"
**Solution**:
- This usually means amount mismatch between UI and contract
- Clear browser cache and reload
- Verify token decimals are correctly configured
- Check that project was created AFTER the decimal fix

### Issue: "Insufficient STX balance"
**Solution**:
- Fund the wallet you are using for contract calls
- Ensure you have enough balance for the escrow call and network fees

### Issue: "sBTC displays wrong amount"
**Solution**:
- Old projects created before the fix may have incorrect amounts
- Create a new project to test with correct decimals
- Verify `getTokenDecimals()` function is being used

---

## 📚 Key Concepts

### Milestone System
- Each project supports **1 to 4 milestones**
- Funds locked in smart contract escrow
- Freelancer marks milestones complete
- Client reviews and releases payment
- Fee handling is enforced by the active escrow contract and mirrored in platform settings

### Transaction Flow

1. **Project Creation**:
   ```
   Client → Backend DB → Open marketplace listing
   ```

2. **Proposal Acceptance + Escrow Activation**:
   ```
   Client → Wallet → Escrow contract call → Backend verification → Project active
   ```

3. **Milestone Completion**:
   ```
   Freelancer → Submit deliverable → Complete milestone state
   ```

4. **Payment Release**:
   ```
   Client → Approve → Release milestone on-chain → Funds move from escrow
   ```

### Smart Contract Functions

```clarity
;; Create a project with STX escrow
(define-public (create-project-stx (freelancer principal) (m1 uint) (m2 uint) (m3 uint) (m4 uint)))

;; Create a project with sBTC escrow
(define-public (create-project-sbtc (freelancer principal) (m1 uint) (m2 uint) (m3 uint) (m4 uint) (sbtc-token <sip010-ft-trait>)))

;; Mark milestone as complete (freelancer)
(define-public (complete-milestone (project-id uint) (milestone-num uint)))

;; Release milestone payment for STX projects
(define-public (release-milestone-stx (project-id uint) (milestone-num uint)))

;; Get project details
(define-read-only (get-project (project-id uint)))
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🔗 Useful Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Hiro Platform](https://platform.hiro.so/)
- [Stacks Testnet Explorer](https://explorer.hiro.so/?chain=testnet)
- [Clarinet Documentation](https://docs.hiro.so/clarinet/)
- [Stacks Connect Guide](https://docs.stacks.co/build-apps/guides/stacks-connect)
- [sBTC Documentation](https://docs.sbtc.tech/)

---

## 💬 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation
- Review testnet transactions on explorer

---

## 🎉 Acknowledgments

Built with:
- Stacks Blockchain
- Hiro Tools & Platform
- React & Vite
- MySQL & Drizzle ORM
- Tailwind CSS & Radix UI

---

**Happy Building! 🚀**
