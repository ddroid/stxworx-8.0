import { type Request, type Response } from "express";
import { projectService } from "../services/project.service";
import { insertProjectSchema } from "@shared/schema";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export const projectController = {
  /** Resolve clientAddress/freelancerAddress by joining user IDs */
  async _enrichWithAddresses(projects: any[]) {
    const userIds = new Set<number>();
    for (const p of projects) {
      if (p.clientId) userIds.add(p.clientId);
      if (p.freelancerId) userIds.add(p.freelancerId);
    }
    if (userIds.size === 0) return projects;
    const rows = await db
      .select({ id: users.id, stxAddress: users.stxAddress })
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));
    const idToAddr: Record<number, string> = {};
    for (const r of rows) idToAddr[r.id] = r.stxAddress;
    return projects.map((p) => ({
      ...p,
      clientAddress: idToAddr[p.clientId] || '',
      freelancerAddress: p.freelancerId ? idToAddr[p.freelancerId] || '' : '',
    }));
  },

  // POST /api/projects
  async create(req: Request, res: Response) {
    try {
      const result = insertProjectSchema.safeParse({ ...req.body, clientId: req.user!.id });
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const project = await projectService.create({ ...result.data, clientId: req.user!.id });
      return res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/projects
  async getAll(req: Request, res: Response) {
    try {
      const { category, tokenType, search } = req.query;
      const allProjects = await projectService.getAll({
        category: category as string,
        tokenType: tokenType as string,
        status: "open",
        search: search as string,
      });

      // Compute budget on each project
      const withBudget = allProjects.map((p) => ({
        ...p,
        budget: projectService.computeBudget(p),
      }));

      const enriched = await projectController._enrichWithAddresses(withBudget);
      return res.status(200).json(enriched);
    } catch (error) {
      console.error("Get projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/projects/:id
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });

      const project = await projectService.getById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      return res.status(200).json({
        ...project,
        budget: projectService.computeBudget(project),
        ...(await projectController._enrichWithAddresses([project]))[0],
      });
    } catch (error) {
      console.error("Get project error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/projects/:id
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });

      const project = await projectService.getById(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.clientId !== req.user!.id) return res.status(403).json({ message: "Not authorized" });
      if (project.status !== "open") return res.status(400).json({ message: "Can only update open projects" });

      const updated = await projectService.update(id, req.body);
      return res.status(200).json(updated);
    } catch (error) {
      console.error("Update project error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // DELETE /api/projects/:id
  async cancel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });

      const project = await projectService.getById(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.clientId !== req.user!.id) return res.status(403).json({ message: "Not authorized" });
      if (project.status !== "open") return res.status(400).json({ message: "Can only cancel open projects" });

      const cancelled = await projectService.cancel(id);
      return res.status(200).json(cancelled);
    } catch (error) {
      console.error("Cancel project error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/projects/my/posted
  async myPosted(req: Request, res: Response) {
    try {
      const projects = await projectService.getByClientId(req.user!.id);
      const withBudget = projects.map((p) => ({
        ...p,
        budget: projectService.computeBudget(p),
      }));
      const enriched = await projectController._enrichWithAddresses(withBudget);
      return res.status(200).json(enriched);
    } catch (error) {
      console.error("My posted projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/projects/my/active
  async myActive(req: Request, res: Response) {
    try {
      const projects = await projectService.getActiveForUser(req.user!.id);
      const withBudget = projects.map((p) => ({
        ...p,
        budget: projectService.computeBudget(p),
      }));
      const enriched = await projectController._enrichWithAddresses(withBudget);
      return res.status(200).json(enriched);
    } catch (error) {
      console.error("My active projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/projects/my/completed
  async myCompleted(req: Request, res: Response) {
    try {
      const projects = await projectService.getCompletedForUser(req.user!.id);
      const withBudget = projects.map((p) => ({
        ...p,
        budget: projectService.computeBudget(p),
      }));
      const enriched = await projectController._enrichWithAddresses(withBudget);
      return res.status(200).json(enriched);
    } catch (error) {
      console.error("My completed projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
