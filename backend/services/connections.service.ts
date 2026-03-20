import { db } from "../db";
import { userConnections, users } from "@shared/schema";
import { and, desc, eq, ne, or } from "drizzle-orm";

async function getOtherUser(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      stxAddress: users.stxAddress,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      specialty: users.specialty,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user || null;
}

export const connectionsService = {
  async findBetween(userId: number, otherUserId: number) {
    const [connection] = await db
      .select()
      .from(userConnections)
      .where(
        or(
          and(eq(userConnections.requesterId, userId), eq(userConnections.addresseeId, otherUserId)),
          and(eq(userConnections.requesterId, otherUserId), eq(userConnections.addresseeId, userId)),
        ),
      );

    return connection || null;
  },

  async areConnected(userId: number, otherUserId: number) {
    const connection = await this.findBetween(userId, otherUserId);
    return connection?.status === "accepted";
  },

  async listForUser(userId: number) {
    const rows = await db
      .select()
      .from(userConnections)
      .where(or(eq(userConnections.requesterId, userId), eq(userConnections.addresseeId, userId)))
      .orderBy(desc(userConnections.updatedAt));

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        otherUser: await getOtherUser(row.requesterId === userId ? row.addresseeId : row.requesterId),
        direction: row.requesterId === userId ? "outgoing" : "incoming",
      })),
    );
  },

  async getSuggestions(userId: number) {
    const existing = await db
      .select()
      .from(userConnections)
      .where(or(eq(userConnections.requesterId, userId), eq(userConnections.addresseeId, userId)));

    const excludedIds = new Set<number>([userId]);
    existing.forEach((row) => {
      excludedIds.add(row.requesterId);
      excludedIds.add(row.addresseeId);
    });

    const candidates = await db
      .select({
        id: users.id,
        stxAddress: users.stxAddress,
        name: users.name,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        specialty: users.specialty,
        avatar: users.avatar,
      })
      .from(users)
      .where(and(eq(users.isActive, true), ne(users.id, userId)));

    return candidates.filter((candidate) => !excludedIds.has(candidate.id)).slice(0, 8);
  },

  async request(userId: number, otherUserId: number) {
    if (userId === otherUserId) {
      throw new Error("You cannot connect with yourself");
    }

    const otherUser = await getOtherUser(otherUserId);
    if (!otherUser?.isActive) {
      throw new Error("User not available");
    }

    const existing = await this.findBetween(userId, otherUserId);
    if (existing?.status === "accepted" || existing?.status === "pending") {
      return existing;
    }

    if (existing) {
      await db
        .update(userConnections)
        .set({
          requesterId: userId,
          addresseeId: otherUserId,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(userConnections.id, existing.id));
      const [updated] = await db.select().from(userConnections).where(eq(userConnections.id, existing.id));
      return updated || null;
    }

    const [result] = await db.insert(userConnections).values({
      requesterId: userId,
      addresseeId: otherUserId,
    });
    const [created] = await db.select().from(userConnections).where(eq(userConnections.id, result.insertId));
    return created || null;
  },

  async respond(connectionId: number, userId: number, status: "accepted" | "declined") {
    const [existing] = await db.select().from(userConnections).where(eq(userConnections.id, connectionId));
    if (!existing) {
      return null;
    }
    if (existing.addresseeId !== userId) {
      throw new Error("Not authorized to respond to this request");
    }

    await db
      .update(userConnections)
      .set({ status, updatedAt: new Date() })
      .where(eq(userConnections.id, connectionId));

    const [updated] = await db.select().from(userConnections).where(eq(userConnections.id, connectionId));
    return updated || null;
  },
};
