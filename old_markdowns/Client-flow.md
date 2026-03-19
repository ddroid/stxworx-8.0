1. CLIENT POSTS PROJECT (Off-Chain)
   ↓ Create project listing in backend DB
   ↓ NO blockchain interaction yet
   ↓ Project status: "Open"
   ↓
2. FREELANCERS PROPOSE (Off-Chain)
   ↓ Submit proposals to backend
   ↓ Client reviews proposals
   ↓
3. CLIENT CLICKS "ACCEPT PROPOSAL"
   ↓ Frontend triggers wallet popup
   ↓ Client signs transaction: create-project-stx(freelancer, m1, m2, m3, m4)
   ↓ Funds locked in smart contract
   ↓ Backend updates: project.status = "Active", project.freelancer = address
   ↓ Other proposals auto-rejected
   ↓
4. WORK BEGINS
   ↓ Freelancer sees project in their dashboard
   ↓ Milestone releases happen on-chain
5. Can raise dispute