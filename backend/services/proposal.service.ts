import { db } from "../db";
import { proposals, projects, users } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";

export const proposalService = {
  async create(data: { projectId: number; freelancerId: number; coverLetter: string }) {
    // Check for existing proposal from same freelancer on same project
    const [existing] = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.projectId, data.projectId),
          eq(proposals.freelancerId, data.freelancerId)
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
    const proposal = await this.getById(proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "pending") throw new Error("Proposal is not pending");

    // Accept this proposal
    await db
      .update(proposals)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(proposals.id, proposalId));
    const [accepted] = await db.select().from(proposals).where(eq(proposals.id, proposalId));

    // Auto-reject all other pending proposals for this project
    await db
      .update(proposals)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(proposals.projectId, proposal.projectId),
          ne(proposals.id, proposalId),
          eq(proposals.status, "pending")
        )
      );

    // Assign freelancer to the project and set status to active
    await db
      .update(projects)
      .set({ 
        freelancerId: proposal.freelancerId, 
        status: "active",
        updatedAt: new Date() 
      })
      .where(eq(projects.id, proposal.projectId));

    return accepted;
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
