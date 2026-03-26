import { db } from "../db";
import { proposals, projects, users } from "@shared/schema";
import { distributeProjectAmount } from "../../shared/project-milestones";
import { eq, and, ne, inArray } from "drizzle-orm";

 type ProposalRecord = typeof proposals.$inferSelect;
 type ProjectRecord = typeof projects.$inferSelect;
 type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

 async function getProposalForUpdate(tx: DbTransaction, proposalId: number) {
   const [proposal] = await tx
     .select()
     .from(proposals)
     .where(eq(proposals.id, proposalId));
   return proposal || null;
 }

 async function getProjectForUpdate(tx: DbTransaction, projectId: number) {
   const [project] = await tx
     .select()
     .from(projects)
     .where(eq(projects.id, projectId));
   return project || null;
 }

 async function acceptProposalInTransaction(tx: DbTransaction, proposalId: number): Promise<{ accepted: ProposalRecord; project: ProjectRecord }> {
   const proposal = await getProposalForUpdate(tx, proposalId);
   if (!proposal) throw new Error("Proposal not found");
   if (proposal.status !== "pending") throw new Error("Proposal is not pending");

   const project = await getProjectForUpdate(tx, proposal.projectId);
   if (!project) throw new Error("Project not found");
   if (project.status === "active") throw new Error("Project escrow has already been funded");

   const distributed = distributeProjectAmount(project, proposal.proposedAmount);

   await tx
     .update(proposals)
     .set({ status: "accepted", updatedAt: new Date() })
     .where(eq(proposals.id, proposalId));

   await tx
     .update(proposals)
     .set({ status: "rejected", updatedAt: new Date() })
     .where(
       and(
         eq(proposals.projectId, proposal.projectId),
         ne(proposals.id, proposalId),
         eq(proposals.status, "pending")
       )
     );

   await tx
     .update(projects)
     .set({
       freelancerId: proposal.freelancerId,
       milestone1Amount: distributed.milestone1Amount,
       milestone2Amount: distributed.milestone2Amount,
       milestone3Amount: distributed.milestone3Amount,
       milestone4Amount: distributed.milestone4Amount,
       updatedAt: new Date()
     })
     .where(eq(projects.id, proposal.projectId));

   const [accepted] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
   const [updatedProject] = await tx.select().from(projects).where(eq(projects.id, proposal.projectId));

   if (!accepted || !updatedProject) {
     throw new Error("Failed to persist accepted proposal state");
   }

   return { accepted, project: updatedProject };
 }

export const proposalService = {
  async create(data: { projectId: number; freelancerId: number; coverLetter: string; proposedAmount: string }) {
    // Check for existing proposal from same freelancer on same project
    const [existing] = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.projectId, data.projectId),
          eq(proposals.freelancerId, data.freelancerId),
          inArray(proposals.status, ["pending", "accepted"])
        )
      );

    if (existing) {
      throw new Error("You have already submitted a proposal for this project");
    }

    const result = await db.insert(proposals).values(data);
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, result[0].insertId));
    return proposal;
  },

  async getByProject(projectId: number) {
    const rows = await db
      .select({
        id: proposals.id,
        projectId: proposals.projectId,
        freelancerId: proposals.freelancerId,
        coverLetter: proposals.coverLetter,
        proposedAmount: proposals.proposedAmount,
        status: proposals.status,
        createdAt: proposals.createdAt,
        updatedAt: proposals.updatedAt,
        freelancerAddress: users.stxAddress,
        freelancerName: users.name,
        freelancerUsername: users.username,
      })
      .from(proposals)
      .leftJoin(users, eq(proposals.freelancerId, users.id))
      .where(eq(proposals.projectId, projectId));
    return rows;
  },

  async getByFreelancer(freelancerId: number) {
    return db
      .select()
      .from(proposals)
      .where(eq(proposals.freelancerId, freelancerId));
  },

  async getById(id: number) {
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, id));
    return proposal || null;
  },

  async accept(proposalId: number) {
    return db.transaction(async (tx) => {
      const { accepted } = await acceptProposalInTransaction(tx, proposalId);
      return accepted;
    });
  },

  async acceptWithEscrowFunding(proposalId: number, escrowTxId: string, onChainId: number) {
    return db.transaction(async (tx) => {
      let proposal = await getProposalForUpdate(tx, proposalId);
      if (!proposal) throw new Error("Proposal not found");

      let project = await getProjectForUpdate(tx, proposal.projectId);
      if (!project) throw new Error("Project not found");

      if (proposal.status === "pending") {
        const acceptedState = await acceptProposalInTransaction(tx, proposalId);
        proposal = acceptedState.accepted;
        project = acceptedState.project;
      } else if (proposal.status !== "accepted") {
        throw new Error("Proposal cannot be funded in its current state");
      }

      if (project.status === "active") {
        throw new Error("Project escrow has already been funded");
      }

      if (project.freelancerId !== proposal.freelancerId) {
        throw new Error("Accepted proposal does not match the assigned freelancer");
      }

      await tx
        .update(projects)
        .set({
          status: "active",
          escrowTxId,
          onChainId,
          updatedAt: new Date()
        })
        .where(eq(projects.id, proposal.projectId));

      const [accepted] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
      if (!accepted) {
        throw new Error("Failed to finalize proposal acceptance");
      }

      return accepted;
    });
  },

  async reject(proposalId: number) {
    await db
      .update(proposals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(proposals.id, proposalId));
    const [rejected] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    return rejected || null;
  },

  async withdraw(proposalId: number) {
    await db
      .update(proposals)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(proposals.id, proposalId));
    const [withdrawn] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    return withdrawn || null;
  },
};
