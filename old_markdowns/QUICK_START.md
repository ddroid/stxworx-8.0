# 🎯 Quick Reference - STX Freelance Platform

Essential commands and info for quick access.

## 🚀 Quick Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:5000)
npm run build            # Build for production
npm run start            # Start production server
npm run check            # TypeScript type checking
```

### Database
```bash
npm run db:setup         # Setup database (push + seed)
npm run db:push          # Push schema to database
npm run db:seed          # Seed with sample data
npm run db:check         # Check database connection
```

### Smart Contracts
```bash
clarinet check           # Validate contract syntax
clarinet test            # Run contract tests
clarinet console         # Interactive REPL
clarinet deployments apply --manifest ./deployments/default.testnet-plan.yaml
```

## 🌐 Important URLs

### Local Development
- Frontend: http://localhost:5000
- Client Dashboard: http://localhost:5000/client
- Freelancer Dashboard: http://localhost:5000/freelancer

### Testnet Resources
- Stacks Explorer: https://explorer.hiro.so/?chain=testnet
- STX Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- Hiro Platform: https://platform.hiro.so/
- sBTC Bridge: https://bridge.sbtc.tech

### Documentation
- Stacks Docs: https://docs.stacks.co/
- Clarity Reference: https://docs.stacks.co/clarity/
- Clarinet Docs: https://docs.hiro.so/clarinet/

## 🔑 Environment Variables

Required in `.env`:
```env
DATABASE_URL=mysql://root:pass@localhost:3306/database
SESSION_SECRET=your-secret-key-min-32-chars
```

## 📊 Token Decimals

**CRITICAL**: Different tokens use different decimals!

| Token | Decimals | Multiplier | Example |
|-------|----------|------------|---------|
| STX   | 6        | 1,000,000  | 60 STX = 60,000,000 microstacks |
| sBTC  | 8        | 100,000,000 | 0.5 sBTC = 50,000,000 satoshis |

### Code Example
```typescript
const getTokenDecimals = (tokenType: string): number => {
  return tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
};

// Convert to micro-units
const microUnits = amount * getTokenDecimals(tokenType);

// Convert to display
const displayAmount = microUnits / getTokenDecimals(tokenType);
```

## 🎨 Project Structure

```
Essential Files Only:
├── client/              # Frontend
├── server/              # Backend
├── contracts/           # Smart contracts
├── shared/              # Shared types
├── deployments/         # Deploy configs
├── settings/            # Clarinet settings
├── tests/               # Contract tests
├── README.md            # Setup guide
├── package.json         # Dependencies
└── .env.example         # Environment template
```

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### Database Connection Failed
```bash
# Check connection
npm run db:check

# Reset database
npm run db:push
npm run db:seed
```

### Contract Not Found
1. Check contract is deployed: Visit explorer
2. Verify `CONTRACT_ADDRESS` in `client/src/lib/stacks.ts`
3. Ensure wallet connected to same network

### Wrong Amount Displayed
- Check token type passed to `microStacksToStx(amount, tokenType)`
- sBTC uses 8 decimals, STX uses 6
- Old projects may need recreation after decimal fix

## 🔐 Security Reminders

- ✅ `.env` in `.gitignore`
- ✅ Never commit secrets
- ✅ Use `.env.example` for templates
- ✅ Generate strong `SESSION_SECRET` (32+ chars)
- ✅ Test on testnet before mainnet

## 📝 Git Workflow

```bash
# Setup
git init
git add .
git commit -m "Initial commit"
git remote add origin <repo-url>
git push -u origin main

# Daily workflow
git add .
git commit -m "feat: descriptive message"
git push
```

## 🧹 Cleanup Repository

### Windows (PowerShell)
```powershell
.\cleanup-repo.ps1
```

### Mac/Linux
```bash
chmod +x cleanup-repo.sh
./cleanup-repo.sh
```

### Manual Cleanup
```bash
# Remove unnecessary files
rm -rf attached_assets/ *.md (except README)
rm history.txt test-contract.clar

# Remove build artifacts
rm -rf node_modules/ dist/ .cache/

# Reinstall
npm install
```

## 🎯 Essential Contract Functions

### Create Escrow
```clarity
(contract-call? .escrow-multi-token-v4 create-escrow
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM  ;; freelancer
  u60000000                                     ;; amount
  "none"                                        ;; token (none=STX)
)
```

### Fund Escrow
```clarity
(contract-call? .escrow-multi-token-v4 fund-escrow u1)
```

### Mark Complete
```clarity
(contract-call? .escrow-multi-token-v4 mark-complete u1 u1)
```

### Release Payment
```clarity
(contract-call? .escrow-multi-token-v4 release-payment u1 u1)
```

## 📈 Platform Economics

- **Milestone Distribution**: 25% each (4 milestones)
- **Platform Fee**: 5% on each release
- **Freelancer Receives**: 95% of milestone amount
- **Example**: 
  - Total: 60 STX
  - Per Milestone: 15 STX
  - Freelancer Gets: 14.25 STX (95%)
  - Platform Gets: 0.75 STX (5%)

## 🚦 Status Flow

```
Project Created → Funded → Milestone 1 Complete → Released → 
  → Milestone 2 Complete → Released → 
  → Milestone 3 Complete → Released → 
  → Milestone 4 Complete → Released → 
  → Project Completed
```

## 📞 Quick Help

**Issue**: Development server won't start
**Fix**: Check port 5000, database connection, .env file

**Issue**: Wallet won't connect
**Fix**: Install Hiro Wallet, switch to testnet, refresh page

**Issue**: Transaction fails
**Fix**: Check STX balance, verify contract address, check network

**Issue**: Wrong amounts showing
**Fix**: Verify token decimals, recreate project if old

---

**Bookmark this page for quick reference!** 🔖
