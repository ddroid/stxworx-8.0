# STX Freelance Platform

A decentralized freelance escrow and bounty platform built on the Stacks blockchain, supporting STX,sBTC and usdcx payments with milestone-based project management.

## 🚀 Quick Start

```bash

# 0. Clone and install
git clone https://github.com/ddroid/stxworx-8.git
cd stxworx-8
npm install
cd ../client
npm install

# 1. Docker compose
docker compose up -d

# 2. Setup environment
cp .env.example .env
# Edit .env with your database URL and session secret

# 3. Setup database
npm run db:setup

# 4. Start development
npm run dev
# Visit http://localhost:5000
```

**For testnet deployment**, jump to [Testnet Deployment](#-testnet-deployment) section.

---

## 🌟 Features

- **Multi-Token Support**: Create escrow projects with STX or sBTC
- **Milestone-Based Payments**: 4 milestones per project with automatic distribution
- **Secure Escrow**: Smart contract-based fund locking and release
- **Role-Based Dashboards**: Separate interfaces for clients and freelancers
- **Real-Time Updates**: Live blockchain transaction tracking
- **5% Platform Fee**: Sustainable fee structure for platform maintenance

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast development
- **TanStack Query** for data fetching and caching
- **Wouter** for client-side routing
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
- Support for **STX** (native) and **sBTC** (SIP-010 token)

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
   - Create or import a testnet wallet

---

## 🚀 Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd stx-freelance-platform
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

The platform uses a multi-token escrow contract (`escrow-multi-token.clar`) that supports:
- **STX**: Native Stacks token (6 decimal places)
- **sBTC**: Bitcoin on Stacks (8 decimal places)

### Testing Contracts Locally

1. **Start Clarinet Console**:
   ```bash
   clarinet console
   ```

2. **Test Contract Functions**:
   ```clarity
   ;; Create a test escrow with STX
   (contract-call? .escrow-multi-token-v4 create-escrow
     'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
     u60000000  ;; 60 STX (60 * 1,000,000 microstacks)
     "none"     ;; Token type (none = STX)
   )
   
   ;; Create a test escrow with sBTC
   (contract-call? .escrow-multi-token-v4 create-escrow
     'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
     u2000000000  ;; 20 sBTC (20 * 100,000,000 micro-sBTC)
     "some .sbtc-token"  ;; sBTC token contract
   )
   ```

3. **Run Test Suite**:
   ```bash
   clarinet test
   ```

---

## 🌐 Testnet Deployment

### Step 1: Prepare Your Testnet Wallet

1. **Get Testnet STX**:
   - Visit [Stacks Testnet Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
   - Enter your wallet address
   - Request testnet STX tokens

2. **Get Testnet sBTC** (if needed):
   - Visit [sBTC Bridge Testnet](https://bridge.sbtc.tech)
   - Bridge some testnet BTC to sBTC

### Step 2: Configure Testnet Deployment

1. **Update `Clarinet.toml`**:
   ```toml
   [project]
   name = "stx-freelance-platform"
   
   [contracts.escrow-multi-token-v4]
   path = "contracts/escrow-multi-token.clar"
   clarity_version = 2
   epoch = 2.5
   ```

2. **Update Deployment Plan** (`deployments/default.testnet-plan.yaml`):
   ```yaml
   ---
   id: 0
   name: Escrow Multi-Token Contract
   network: testnet
   stacks-node: "https://api.testnet.hiro.so"
   contracts:
     - contract-publish:
         contract-name: escrow-multi-token-v4
         expected-sender: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
         cost: 50000
         path: contracts/escrow-multi-token.clar
         clarity-version: 2
         epoch: 2.5
   ```

### Step 3: Deploy Contract to Testnet

1. **Check Contract Syntax**:
   ```bash
   clarinet check
   ```

2. **Deploy Using Clarinet**:
   ```bash
   clarinet deployments apply --manifest ./deployments/default.testnet-plan.yaml
   ```

   Or manually deploy using the Hiro Platform:

3. **Manual Deployment (Alternative)**:
   - Visit [Hiro Platform](https://platform.hiro.so/)
   - Connect your testnet wallet
   - Navigate to "Deploy Contract"
   - Upload `contracts/escrow-multi-token.clar`
   - Set contract name: `escrow-multi-token-v4`
   - Review and deploy

### Step 4: Update Frontend Configuration

After deploying, update the contract address in your frontend:

**File**: `client/src/lib/stacks.ts`

```typescript
// Update these values with your deployed contract
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Your testnet address
const CONTRACT_NAME = 'escrow-multi-token-v4';

// For sBTC, update the token contract address
const SBTC_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token'; // Testnet sBTC contract
```

### Step 5: Verify Deployment

1. **Check Contract on Explorer**:
   - Visit [Stacks Testnet Explorer](https://explorer.hiro.so/?chain=testnet)
   - Search for your contract address
   - Verify contract is deployed and callable

2. **Test Contract Functions**:
   ```bash
   # Read contract source
   clarinet contracts describe escrow-multi-token-v4 --testnet
   
   # Check contract functions
   clarinet contracts functions escrow-multi-token-v4 --testnet
   ```

---

## 🎯 Usage Guide

### For Clients (Creating Projects)

1. **Connect Wallet**:
   - Click "Connect Wallet" in navigation
   - Approve connection in Hiro Wallet

2. **Create Project**:
   - Navigate to `/client` dashboard
   - Click "Create New Project"
   - Fill in project details:
     - **Title**: Project name
     - **Category**: Type of work
     - **Token Type**: STX or sBTC
     - **Total Amount**: Total project budget
     - **Freelancer Address**: Recipient wallet address
     - **Description**: Project requirements

3. **Fund Project**:
   - After creation, click "Fund Project"
   - Approve blockchain transaction
   - Funds locked in escrow contract

4. **Manage Milestones**:
   - View milestone progress
   - Review freelancer submissions
   - Release payments upon approval

### For Freelancers (Completing Work)

1. **Connect Wallet**:
   - Use the same address shared with client

2. **View Projects**:
   - Navigate to `/freelancer` dashboard
   - See all assigned projects

3. **Complete Milestones**:
   - Deliver work for each milestone
   - Click "Mark Complete" button
   - Add completion description and deliverable links
   - Submit blockchain transaction

4. **Receive Payments**:
   - Client reviews and releases payment
   - Funds automatically sent to your wallet
   - Platform fee (5%) deducted automatically

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
│   │   └── x402.ts
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
npm run dev              # Start development server (frontend + backend)

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
clarinet deployments apply --manifest ./deployments/default.testnet-plan.yaml  # Deploy to testnet
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

# Run specific test file
clarinet test tests/escrow-v4_test.ts

# Interactive testing
clarinet console
```

### Manual Testing Checklist

- [ ] Connect wallet (testnet)
- [ ] Create STX project
- [ ] Create sBTC project
- [ ] Fund project
- [ ] Mark milestone complete (freelancer)
- [ ] Release milestone payment (client)
- [ ] Verify amounts display correctly
- [ ] Check platform fee deduction (5%)
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
- Verify contract is deployed to testnet
- Check `CONTRACT_ADDRESS` and `CONTRACT_NAME` in `stacks.ts`
- Ensure you're connected to the correct network in wallet

### Issue: "Post-condition failed"
**Solution**:
- This usually means amount mismatch between UI and contract
- Clear browser cache and reload
- Verify token decimals are correctly configured
- Check that project was created AFTER the decimal fix

### Issue: "Insufficient STX balance"
**Solution**:
- Get testnet STX from [faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
- Ensure you have enough for transaction fees (~0.1 STX)

### Issue: "sBTC displays wrong amount"
**Solution**:
- Old projects created before the fix may have incorrect amounts
- Create a new project to test with correct decimals
- Verify `getTokenDecimals()` function is being used

---

## 📚 Key Concepts

### Milestone System
- Each project has **4 milestones** (25% each)
- Funds locked in smart contract escrow
- Freelancer marks milestones complete
- Client reviews and releases payment
- Automatic 5% platform fee on each release

### Transaction Flow

1. **Project Creation**:
   ```
   Client → Frontend → Backend DB → Blockchain (Contract deployment)
   ```

2. **Funding**:
   ```
   Client → Wallet → Smart Contract (STX/sBTC locked)
   ```

3. **Milestone Completion**:
   ```
   Freelancer → Mark Complete → Blockchain (update state)
   ```

4. **Payment Release**:
   ```
   Client → Approve → Smart Contract → Transfer (95% to freelancer, 5% platform fee)
   ```

### Smart Contract Functions

```clarity
;; Create new escrow
(define-public (create-escrow (freelancer principal) (total-amount uint) (token (optional principal))))

;; Fund escrow with tokens
(define-public (fund-escrow (escrow-id uint)))

;; Mark milestone as complete (freelancer)
(define-public (mark-complete (escrow-id uint) (milestone-num uint)))

;; Release milestone payment (client)
(define-public (release-payment (escrow-id uint) (milestone-num uint)))

;; Get escrow details
(define-read-only (get-escrow (escrow-id uint)))
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
