# STXWorx Freelance Platform - Setup Guide

Complete step-by-step guide to set up the STXWorx freelance platform locally for development.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | v18+ | Runtime for backend & frontend |
| **npm** | v9+ | Package manager (comes with Node.js) |
| **MySQL** | v8.0+ | Database |
| **Clarinet** | v2+ | Clarity smart contract development |
| **Git** | Latest | Version control |
| **Hiro Wallet** | Browser extension | Stacks wallet for testing |

### Install Node.js

```bash
# macOS (Homebrew)
brew install node

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### Install MySQL

```bash
# macOS (Homebrew)
brew install mysql
brew services start mysql

# Set root password (if not already set)
mysql_secure_installation
```

### Install Clarinet

```bash
# macOS (Homebrew)
brew install clarinet

# Or via cargo
cargo install clarinet-cli
```

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd STX-WORX-COPY
```

---

## 2. Install Dependencies

The project has three separate `package.json` files. Install all dependencies:

```bash
# Root dependencies (backend + shared)
npm install

# Frontend dependencies
cd stxworx-freelance
npm install
cd ..

# Smart contract dependencies
cd smart-contracts
npm install
cd ..
```

---

## 3. Database Setup

### 3.1 Create the MySQL Database

```bash
# Log into MySQL
mysql -u root -p

# Create the database
CREATE DATABASE stx_freelance;

# Verify it was created
SHOW DATABASES;

# Exit MySQL
EXIT;
```

### 3.2 Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example or create fresh
cp .env.production.example .env
```

Edit the `.env` file with your local settings:

```env
# Database connection
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@127.0.0.1:3306/stx_freelance"

# Session secret (change this to a random string, min 32 characters)
SESSION_SECRET="change-this-to-a-random-secret-key-min-32-chars"

# Environment
NODE_ENV=development

# Backend port
PORT=5001
```

> **Important:** Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password.

### 3.3 Push the Database Schema

This creates all the required tables using Drizzle ORM:

```bash
npm run db:push
```

**Tables created:**

| Table | Description |
|-------|-------------|
| `users` | Client and freelancer accounts |
| `admins` | Platform administrators |
| `projects` | Freelance projects with up to 4 milestones |
| `proposals` | Freelancer proposals for projects |
| `milestone_submissions` | Work deliverables submitted by freelancers |
| `disputes` | Milestone disputes |
| `reviews` | User reviews and ratings |
| `leaderboard` | Freelancer rankings |
| `notifications` | User notifications |
| `nfts` | NFT badge records |
| `categories` | Project categories |
| `badges` | User badges |

### 3.4 Seed the Database

This populates default categories and creates the initial admin account:

```bash
npm run db:seed
```

**Seeded data includes:**
- **Default Admin Account:**
  - Username: `admin`
  - Password: `SuperSecretAdminPassword123!`
- **7 Project Categories:** Smart Contracts, Web Development, Design, Auditing, Writing, Marketing, Media & Content

### 3.5 Verify Database Connection

```bash
npm run db:check
```

You should see a success message confirming the database is reachable.

> **Shortcut:** Run `npm run db:setup` to push schema + seed in one command.

---

## 4. Frontend Environment Variables

Create a `.env.local` file inside the `stxworx-freelance/` directory:

```bash
touch stxworx-freelance/.env.local
```

Add the following:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> This key is used for the AI-powered features. You can get one from [Google AI Studio](https://aistudio.google.com/apikey). If you don't need AI features, you can leave it as a placeholder.

---

## 5. Start the Development Servers

### Option A: Run Backend + Frontend Together (Recommended)

From the project root:

```bash
npm run dev
```

This starts the Express backend on port **5001** using `tsx` with hot reload.

Then in a **separate terminal**, start the frontend:

```bash
cd stxworx-freelance
npm run dev
```

This starts the Vite dev server on port **3000**.

### Option B: Frontend Only (if backend is already running)

```bash
cd stxworx-freelance
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:5001/api |
| **Admin Dashboard** | http://localhost:3000/stx-ops-9x7k |

> The Vite dev server proxies all `/api` requests to the backend at `http://localhost:5001`, so you only need to access port 3000 in your browser.

---

## 6. Smart Contract Development

### 6.1 Check Contracts Compile

```bash
cd smart-contracts
clarinet check
```

### 6.2 Run Contract Tests

```bash
# From project root
npm run test

# Watch mode
npm run test:watch
```

### 6.3 Start Clarinet Devnet

For local blockchain testing with a full devnet:

```bash
cd smart-contracts
clarinet devnet start
```

This gives you:
- A local Stacks blockchain
- Pre-funded test wallets
- A block explorer at http://localhost:8000

### 6.4 Fuzz Testing

```bash
npm run test:fuzz
```

### Deployed Contracts (Testnet)

| Contract | Address |
|----------|---------|
| **Escrow** | `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.escrow-contract-v1` |
| **NFT Badges** | `STVNRH0FC9XJP8J18C92J09MNBS2BS2TW6RCAQ87.stxworx-v1` |

---

## 7. Wallet Setup (Hiro Wallet)

1. Install the [Hiro Wallet](https://wallet.hiro.so/) browser extension
2. Create or import a wallet
3. **Switch to Testnet:**
   - Open Hiro Wallet
   - Go to Settings > Network
   - Select **Testnet**
4. Get test STX from the [Stacks Testnet Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

> **Important:** The application is configured for **testnet**. Make sure your wallet is set to testnet, otherwise transactions will target mainnet addresses.

---

## 8. Project Structure

```
STX-WORX-COPY/
├── backend/                     # Express.js API server
│   ├── index.ts                # Server entry point (port 5001)
│   ├── db.ts                   # Drizzle database connection
│   ├── drizzle.config.ts       # Drizzle ORM configuration
│   ├── seed.ts                 # Database seeding script
│   ├── routes/                 # API route handlers
│   │   ├── auth.routes.ts      # Authentication (/api/auth)
│   │   ├── user.routes.ts      # Users (/api/users)
│   │   ├── project.routes.ts   # Projects (/api/projects)
│   │   ├── proposal.routes.ts  # Proposals (/api/proposals)
│   │   ├── milestone.routes.ts # Milestones (/api/milestones)
│   │   ├── dispute.routes.ts   # Disputes (/api/disputes)
│   │   ├── review.routes.ts    # Reviews (/api/reviews)
│   │   ├── category.routes.ts  # Categories (/api/categories)
│   │   ├── admin.routes.ts     # Admin (/api/admin)
│   │   └── notification.routes.ts # Notifications (/api/notifications)
│   ├── middleware/             # Express middleware (auth, etc.)
│   ├── controllers/            # Business logic
│   └── services/               # Service layer
│
├── stxworx-freelance/           # React frontend (Vite)
│   ├── index.html              # HTML entry point
│   ├── index.tsx               # React entry point
│   ├── App.tsx                 # Root React component
│   ├── vite.config.ts          # Vite configuration
│   ├── package.json            # Frontend dependencies
│   ├── .env.local              # Frontend environment variables
│   ├── components/             # React components
│   │   ├── admin/              # Admin dashboard components
│   │   ├── wallet/             # Wallet connection components
│   │   └── ...
│   ├── lib/                    # Utilities & contract calls
│   │   ├── api.ts              # Backend API client
│   │   ├── contracts.ts        # Smart contract call functions
│   │   ├── constants.ts        # Contract addresses & constants
│   │   └── stacks.ts           # Wallet authentication
│   ├── stores/                 # Zustand state management
│   └── types/                  # TypeScript type definitions
│
├── smart-contracts/             # Clarity smart contracts
│   ├── Clarinet.toml           # Clarinet project config
│   ├── contracts/
│   │   ├── escrow-multi-token.clar  # Escrow contract
│   │   └── stxworx-badge.clar      # NFT badge contract
│   ├── tests/                  # Vitest contract tests
│   └── settings/               # Clarinet network settings
│
├── shared/                      # Shared between frontend & backend
│   └── schema.ts               # Drizzle database schema
│
├── badge-metadata/              # NFT badge metadata (IPFS)
│   ├── bronze.json
│   ├── silver.json
│   ├── gold.json
│   ├── platinum.json
│   └── verified.json
│
├── .env                         # Backend environment variables
├── package.json                 # Root dependencies & scripts
└── tsconfig.json                # TypeScript configuration
```

---

## 9. Available Scripts

### Root (Backend + Build)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend dev server with hot reload |
| `npm run build` | Build frontend (Vite) + backend (esbuild) for production |
| `npm run start` | Start production server from `dist/` |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:seed` | Seed database with defaults |
| `npm run db:setup` | Push schema + seed (combined) |
| `npm run db:check` | Test database connection |
| `npm run test` | Run smart contract tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:fuzz` | Run fuzz tests (500 runs) |

### Frontend (`stxworx-freelance/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

### Smart Contracts (`smart-contracts/`)

| Command | Description |
|---------|-------------|
| `clarinet check` | Validate contracts compile |
| `clarinet devnet start` | Start local blockchain |
| `clarinet console` | Interactive Clarity REPL |

---

## 10. Production Build

```bash
# Build everything
npm run build

# Start production server
npm run start
```

This builds:
- **Frontend** → `dist/public/` (Vite static build)
- **Backend** → `dist/backend/` (esbuild bundle)

The production server serves both the API and the static frontend from a single Node.js process on the configured `PORT`.

---

## 11. Troubleshooting

### Database Connection Failed

```
Error: Access denied for user 'root'@'localhost'
```

- Verify MySQL is running: `brew services list` or `systemctl status mysql`
- Check your password in `.env` matches your MySQL root password
- Ensure the `stx_freelance` database exists

### Port Already in Use

```
Error: listen EADDRINUSE :::5001
```

- Kill the existing process: `lsof -ti:5001 | xargs kill -9`
- Or change the port in `.env`

### Vite Cache Issues

If you see `504 Outdated Optimize Dep` or stale module errors:

```bash
rm -rf stxworx-freelance/node_modules/.vite
# Restart the frontend dev server
```

### Rate Limiting (429 Too Many Requests)

In development, rate limits are relaxed. If you still hit them:
- The global limit is 1000 requests per 15 minutes in dev mode
- Auth endpoint allows 120 requests per 15 minutes in dev mode
- Wait 15 minutes or restart the backend server to reset

### Wallet Connecting to Mainnet

The app is configured for testnet. If your wallet shows mainnet (SP...) addresses instead of testnet (ST...):
- Open Hiro Wallet > Settings > Network > select **Testnet**
- Reconnect your wallet

### Smart Contract Tests Failing

```bash
cd smart-contracts
clarinet check    # Verify contracts compile first
npm test          # Then run tests
```

---

## Quick Start Checklist

```
[ ] Node.js v18+ installed
[ ] MySQL v8+ installed and running
[ ] Created `stx_freelance` database
[ ] Created root `.env` with DATABASE_URL
[ ] Ran `npm install` (root)
[ ] Ran `npm install` (stxworx-freelance/)
[ ] Ran `npm install` (smart-contracts/)
[ ] Ran `npm run db:setup` (schema + seed)
[ ] Created `stxworx-freelance/.env.local`
[ ] Started backend: `npm run dev`
[ ] Started frontend: `cd stxworx-freelance && npm run dev`
[ ] Installed Hiro Wallet and switched to Testnet
[ ] Opened http://localhost:3000
```
