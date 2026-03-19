1. FREELANCER BROWSES JOBS
   ↓ View "Browse gigs"
   ↓ Click on interesting project to view details

2. FREELANCER SUBMITS PROPOSAL (Off-Chain)
   ↓ Read project description and milestones
   ↓ Write cover letter explaining why they're a good fit
   ↓ Submit proposal to backend DB
   ↓ Proposal status: "Pending"
   ↓
3. FREELANCER WAITS FOR CLIENT DECISION
   ↓ Proposal appears in "My Proposals" → "Pending" tab
   ↓ Can withdraw proposal if they change their mind
   ↓ Receives notification when client reviews proposal - For now we are not implementing notification.
   ↓
4. PROPOSAL ACCEPTED (Client funds escrow)
   ↓ Freelancer sees the project in their personal dashboard once assigned to them. 
   ↓ Proposal status changes to "Accepted"
   ↓ Escrow confirmed on blockchain (visible on-chain)
   ↓ Project appears in "My Projects" → "Active" tab
   ↓
5. FREELANCER WORKS ON MILESTONES
   ↓ View project details and milestone breakdown
   ↓ Complete Milestone 1 work
   ↓ Submit deliverable link (GitHub, Figma, Google Drive, etc.)
   ↓ Click "Submit Milestone 1 for Review"
   ↓ Wallet popup: Sign transaction complete-milestone(project-id, 1)
   ↓ Milestone status: "Submitted" (waiting for client approval)
   ↓
6. CLIENT REVIEWS & RELEASES PAYMENT
   ↓ Client approves milestone
   ↓ Client calls release-milestone-stx(project-id, 1)
   ↓ Funds transferred from escrow to freelancer wallet 
   ↓ Freelancer receives a message that funds has been received
   ↓ Milestone status: "Approved"
   ↓
7. REPEAT FOR REMAINING MILESTONES
   ↓ Complete Milestone 2 → Submit → Client approves → Payment released
   ↓ Complete Milestone 3 → Submit → Client approves → Payment released
   ↓ Complete Milestone 4 → Submit → Client approves → Payment released
   ↓
8. PROJECT COMPLETED
   ↓ All milestones approved and paid
   ↓ Project status: "Completed"
   ↓ Freelancer can leave review for client (optional)
   ↓ Project moves to "My Projects" → "Completed" tab
9. Can raise dispute