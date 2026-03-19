# 🎖️ NFT BADGE & VERIFICATION FLOW

This flow describes the lifecycle of Soulbound NFTs (Badges) used for reputation and identity on STXWorx.

---

## **1. REPUTATION GRADE FLOW (Admin-Led)**

```
1. PERFORMANCE REVIEW
   ↓ Admin monitors user stats (Earnings, Success Rate, Reviews)
   ↓ Admin identifies a user for a "Bronze", "Silver", "Gold", or "Platinum" badge
   ↓
2. MINTING THE GRADE
   ↓ Admin inputs user wallet address and selected grade tier
   ↓ Wallet Popup: Sign admin-mint-grade transaction
   ↓ NFT is minted directly to the user's wallet
   ↓ Status: User profile now displays the Grade Badge
   ↓
3. PROGRESSION (Upgrade Flow)
   ↓ User improves performance over time
   ↓ Admin decides to upgrade user (e.g., Bronze → Silver)
   ↓ Wallet Popup: Sign admin-upgrade-grade transaction
   ↓ Smart Contract: BURNS the Bronze NFT and MINTS the Silver NFT
   ↓ Status: Profile updated to Silver tier
   ↓
4. DISCIPLINARY (Revocation Flow)
   ↓ User violates platform terms or project guidelines
   ↓ Admin decides to strip the user of their reputation
   ↓ Wallet Popup: Sign admin-revoke-grade transaction
   ↓ Smart Contract: BURNS the user's Grade NFT
   ↓ Status: User returns to "No Badge" state
```

---

## **2. IDENTITY VERIFICATION FLOW (Backend-Led)**

```
1. USER SUBMITS VERIFICATION
   ↓ User completes profile, uploads ID, or passes social verification
   ↓ System (Backend) validates the inputs
   ↓
2. AUTOMATIC ISSUANCE
   ↓ Backend triggers the mint-verified transaction
   ↓ NFT "Verified" checkmark is minted to the user's wallet
   ↓ Status: Profile displays a "Verified" checkmark badge
   ↓
3. ACCOUNT SUSPENSION (Revocation)
   ↓ User is flagged for fraud or impersonation
   ↓ Admin or Backend triggers revoke-verified
   ↓ Smart Contract: BURNS the verification NFT
   ↓ Status: User loses "Verified" status
```

---

## **3. THE SOULBOUND RULE**

```
1. NO TRADING / NO TRANSFER
   ↓ User attempts to send their Platinum Badge to another wallet
   ↓ Transaction Call: transfer(token-id, sender, recipient)
   ↓ RESULT: Transaction fails with ERR-SOULBOUND (u203)
   ↓
2. REPUTATION INTEGRITY
   ↓ Meaning: Badges cannot be bought or sold
   ↓ Meaning: Reputation is tied permanently to the specific Stacks identity
```

---

## **🎯 How It Appears on Platform**

| Level | Badge Type | Authority | Effect |
| :--- | :--- | :--- | :--- |
| **Verified** | Identity Check | Backend | Boosts trust in job proposals |
| **Grade** | Reputation Tier | Admin | Unlocks higher budget projects |
| **Soulbound** | Non-Transferable | Contract | Ensures reputation can't be "faked" |
