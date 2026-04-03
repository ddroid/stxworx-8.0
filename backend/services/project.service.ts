import { db } from "../db";
import { projects } from "@shared/schema";
import { eq, and, or, like, sql } from "drizzle-orm";
import type { InsertProject, Project } from "@shared/schema";

export const projectService = {
  computeBudget(project: Project): string {
    const m1 = Number(project.milestone1Amount) || 0;
    const m2 = Number(project.milestone2Amount) || 0;
    const m3 = Number(project.milestone3Amount) || 0;
    const m4 = Number(project.milestone4Amount) || 0;
    return String(m1 + m2 + m3 + m4);
  },

  async create(data: InsertProject & { clientId: number }) {
    const result = await db.insert(projects).values(data);
    const [project] = await db.select().from(projects).where(eq(projects.id, result[0].insertId));
    return project;
  },

  async getAll(filters?: {
    category?: string;
    tokenType?: string;
    status?: string;
    search?: string;
  }) {
    let query = db.select().from(projects);

    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(projects.category, filters.category));
    }
    if (filters?.tokenType) {
      conditions.push(eq(projects.tokenType, filters.tokenType as "STX" | "sBTC" | "USDCx"));
    }
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(projects.title, `%${filters.search}%`),
          like(projects.description, `%${filters.search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result;
  },

  async getById(id: number) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project || null;
  },

  async getByClientId(clientId: number) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.clientId, clientId));
  },

  async getByFreelancerId(freelancerId: number) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.freelancerId, freelancerId));
  },

  async getActiveForUser(userId: number) {
    return db
      .select()
      .from(projects)
      .where(
        and(
          or(
            eq(projects.status, "active"),
            eq(projects.status, "disputed")
          ),
          or(
            eq(projects.clientId, userId),
            eq(projects.freelancerId, userId)
          )
        )
      );
  },

  async getCompletedForUser(userId: number) {
    return db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.status, "completed"),
          or(
            eq(projects.clientId, userId),
            eq(projects.freelancerId, userId)
          )
        )
      );
  },

  async update(id: number, data: Partial<Project>) {
    await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id));
    const [updated] = await db.select().from(projects).where(eq(projects.id, id));
    return updated || null;
  },

  async cancel(id: number) {
    return this.update(id, { status: "cancelled" });
  },
};
