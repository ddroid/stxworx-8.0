# STX Freelance Platform

A decentralized freelance escrow platform built on the Stacks blockchain, supporting both STX and sBTC payments with milestone-based project management.

## 🚀 Quick Start

```bash

# 0. Clone and install
git clone https://github.com/ddroid/stxworx-8.git
cd stxworx-8
npm install
cd backend
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
stx-freelance-platform/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utilities and helpers
│   │   │   ├── stacks.ts      # Blockchain interaction
│   │   │   ├── prices.ts      # Token price fetching
│   │   │   └── utils.ts       # Helper functions
│   │   └── hooks/             # Custom React hooks
│   └── index.html             # Entry HTML file
├── server/                    # Backend Express server
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API route handlers
│   ├── db.ts                  # Database connection
│   └── storage.ts             # Session storage
├── contracts/                 # Clarity smart contracts
│   └── escrow-multi-token.clar # Main escrow contract
├── shared/                    # Shared TypeScript types
│   └── schema.ts              # Database schema & types
├── deployments/               # Contract deployment configs
│   ├── default.testnet-plan.yaml
│   └── default.devnet-plan.yaml
├── settings/                  # Clarinet settings
│   ├── Testnet.toml
│   └── Devnet.toml
├── tests/                     # Contract tests
│   └── escrow-v4_test.ts
├── Clarinet.toml              # Clarinet configuration
├── package.json               # Node dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite bundler config
├── tailwind.config.ts         # Tailwind CSS config
├── drizzle.config.ts          # Database ORM config
└── .env                       # Environment variables (gitignored)
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
