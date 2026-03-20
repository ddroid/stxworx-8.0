import { db } from "../db";
import { bounties, bountySubmissions, users } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

export const bountyService = {
  async list(userId?: number) {
    const rows = await db
      .select({
        id: bounties.id,
        createdById: bounties.createdById,
        title: bounties.title,
        description: bounties.description,
        links: bounties.links,
        reward: bounties.reward,
        status: bounties.status,
        createdAt: bounties.createdAt,
        updatedAt: bounties.updatedAt,
        creatorAddress: users.stxAddress,
        creatorName: users.name,
        creatorUsername: users.username,
      })
      .from(bounties)
      .leftJoin(users, eq(bounties.createdById, users.id))
      .orderBy(desc(bounties.createdAt));

    return Promise.all(
      rows.map(async (row) => {
        const submissions = await db.select().from(bountySubmissions).where(eq(bountySubmissions.bountyId, row.id));
        const mySubmission = userId ? submissions.find((submission) => submission.userId === userId) : null;

        return {
          ...row,
          submissionCount: submissions.length,
          hasParticipated: Boolean(mySubmission),
          mySubmissionStatus: mySubmission?.status ?? null,
        };
      }),
    );
  },

  async create(createdById: number, data: { title: string; description: string; links?: string; reward: string }) {
    const [result] = await db.insert(bounties).values({
      createdById,
      title: data.title,
      description: data.description,
      links: data.links ?? null,
      reward: data.reward,
    });

    const [created] = await db.select().from(bounties).where(eq(bounties.id, result.insertId));
    return created || null;
  },

  async submit(bountyId: number, userId: number, data: { description: string; links?: string }) {
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, bountyId));
    if (!bounty) {
      throw new Error("Bounty not found");
    }
    if (bounty.status !== "open") {
      throw new Error("Bounty is not accepting submissions");
    }

    const [existing] = await db
      .select()
      .from(bountySubmissions)
      .where(and(eq(bountySubmissions.bountyId, bountyId), eq(bountySubmissions.userId, userId)));

    if (existing) {
      throw new Error("You have already submitted to this bounty");
    }

    const [result] = await db.insert(bountySubmissions).values({
      bountyId,
      userId,
      description: data.description,
      links: data.links ?? null,
    });

    const [created] = await db.select().from(bountySubmissions).where(eq(bountySubmissions.id, result.insertId));
    return created || null;
  },

  async getDashboard(userId: number) {
    const posted = await db
      .select()
      .from(bounties)
      .where(eq(bounties.createdById, userId))
      .orderBy(desc(bounties.createdAt));

    const participations = await db
      .select({
        id: bountySubmissions.id,
        bountyId: bountySubmissions.bountyId,
        description: bountySubmissions.description,
        links: bountySubmissions.links,
        status: bountySubmissions.status,
        createdAt: bountySubmissions.createdAt,
        bountyTitle: bounties.title,
        reward: bounties.reward,
      })
      .from(bountySubmissions)
      .leftJoin(bounties, eq(bountySubmissions.bountyId, bounties.id))
      .where(eq(bountySubmissions.userId, userId))
      .orderBy(desc(bountySubmissions.createdAt));

    return { posted, participations };
  },
};
