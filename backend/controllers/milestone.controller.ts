import { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { milestoneSubmissions, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { projectService } from "../services/project.service";
import { notificationService } from "../services/notification.service";
import { refundService } from "../services/refund.service";
import type { Project } from "@shared/schema";

const submitSchema = z.object({
  projectId: z.number().int(),
  milestoneNum: z.number().int().min(1).max(4),
  deliverableUrl: z.string().min(1).max(500),
  description: z.string().optional(),
  completionTxId: z.string().max(100).optional(),
});

const approveSchema = z.object({
  releaseTxId: z.string().min(1).max(100),
});

/** Get the token amount for a specific milestone number */
function getMilestoneAmount(project: Project, milestoneNum: number): number {
  switch (milestoneNum) {
    case 1: return Number(project.milestone1Amount) || 0;
    case 2: return Number(project.milestone2Amount) || 0;
    case 3: return Number(project.milestone3Amount) || 0;
    case 4: return Number(project.milestone4Amount) || 0;
    default: return 0;
  }
}

export const milestoneController = {
  // POST /api/milestones/submit
  async submit(req: Request, res: Response) {
    try {
      const result = submitSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const { projectId, milestoneNum, deliverableUrl, description, completionTxId } = result.data;

      // Verify project and freelancer
      const project = await projectService.getById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.freelancerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (project.status !== "active") {
        return res.status(400).json({ message: "Project is not active" });
      }

      // Check if there's an existing submission for this milestone
      const [existing] = await db
        .select()
        .from(milestoneSubmissions)
        .where(
          and(
            eq(milestoneSubmissions.projectId, projectId),
            eq(milestoneSubmissions.milestoneNum, milestoneNum),
            eq(milestoneSubmissions.freelancerId, req.user!.id)
          )
        );

      if (existing) {
        // Only allow resubmission if the previous submission was rejected
        if (existing.status !== "rejected") {
          return res.status(400).json({ message: "This milestone has already been submitted and is not eligible for resubmission" });
        }
        
        // Update the existing rejected submission
        await db
          .update(milestoneSubmissions)
          .set({
            deliverableUrl,
            description,
            completionTxId,
            status: "submitted",
            submittedAt: new Date(),
            reviewedAt: null,
            releaseTxId: null,
          })
          .where(eq(milestoneSubmissions.id, existing.id));
        
        const [submission] = await db.select().from(milestoneSubmissions).where(eq(milestoneSubmissions.id, existing.id));

        // Notify the client about the resubmission
        try {
          await notificationService.create({
            userId: project.clientId,
            type: "milestone_submitted",
            title: `Milestone ${milestoneNum} Resubmitted`,
            message: `Your freelancer has resubmitted deliverables for Milestone ${milestoneNum} on "${project.title}". Please review and approve or reject.`,
            projectId: project.id,
          });
        } catch (e) {
          console.error("Failed to create submission notification:", e);
        }

        return res.status(200).json(submission);
      }

      // Create new submission if none exists
      const insertResult = await db
        .insert(milestoneSubmissions)
        .values({
          projectId,
          milestoneNum,
          freelancerId: req.user!.id,
          deliverableUrl,
          description,
          completionTxId,
        });
      const [submission] = await db.select().from(milestoneSubmissions).where(eq(milestoneSubmissions.id, insertResult[0].insertId));

      // Notify the client that a milestone was submitted
      try {
        await notificationService.create({
          userId: project.clientId,
          type: "milestone_submitted",
          title: `Milestone ${milestoneNum} Submitted`,
          message: `Your freelancer has submitted deliverables for Milestone ${milestoneNum} on "${project.title}". Please review and approve or reject.`,
          projectId: project.id,
        });
      } catch (e) {
        console.error("Failed to create submission notification:", e);
      }

      return res.status(201).json(submission);
    } catch (error) {
      console.error("Submit milestone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/milestones/:id/approve
  async approve(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid submission ID" });

      const result = approveSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const [submission] = await db
        .select()
        .from(milestoneSubmissions)
        .where(eq(milestoneSubmissions.id, id));

      if (!submission) return res.status(404).json({ message: "Submission not found" });

      // Verify client owns the project
      const project = await projectService.getById(submission.projectId);
      if (!project || project.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (project.status !== "active") {
        return res.status(400).json({ message: "Only active projects can release milestone funds" });
      }

      const refundSummary = await refundService.getProjectRefundStatus(project.id);
      if (refundSummary.status === "requested" || refundSummary.status === "approved" || refundSummary.status === "refunded") {
        return res.status(400).json({ message: "Milestone payout is blocked while a refund is pending or completed" });
      }

      await db
        .update(milestoneSubmissions)
        .set({
          status: "approved",
          releaseTxId: result.data.releaseTxId,
          reviewedAt: new Date(),
        })
        .where(eq(milestoneSubmissions.id, id));
      const [updated] = await db.select().from(milestoneSubmissions).where(eq(milestoneSubmissions.id, id));

      // Check if all milestones are approved to mark project as completed
      const allSubmissions = await db
        .select()
        .from(milestoneSubmissions)
        .where(eq(milestoneSubmissions.projectId, project.id));

      const approvedCount = allSubmissions.filter((s) => s.status === "approved").length;
      if (approvedCount >= project.numMilestones) {
        await projectService.update(project.id, { status: "completed" });
      }

      // Update freelancer earnings
      if (submission.freelancerId) {
        const milestoneAmount = getMilestoneAmount(project, submission.milestoneNum);
        if (milestoneAmount > 0) {
          await db
            .update(users)
            .set({
              totalEarned: sql`${users.totalEarned} + ${String(milestoneAmount)}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, submission.freelancerId));
        }
      }

      
      // Notify the freelancer that their milestone was approved
      try {
        if (submission.freelancerId) {
          const isProjectComplete = approvedCount >= project.numMilestones;
          await notificationService.create({
            userId: submission.freelancerId,
            type: "milestone_approved",
            title: `Milestone ${submission.milestoneNum} Approved`,
            message: isProjectComplete
              ? `Milestone ${submission.milestoneNum} on "${project.title}" has been approved and funds released! All milestones complete — project marked as finished.`
              : `Milestone ${submission.milestoneNum} on "${project.title}" has been approved and funds released to your wallet.`,
            projectId: project.id,
          });

          if (isProjectComplete) {
            await notificationService.create({
              userId: project.clientId,
              type: "project_completed",
              title: "Project Completed",
              message: `All milestones on "${project.title}" have been approved. The project is now complete!`,
              projectId: project.id,
            });
          }
        }
      } catch (e) {
        console.error("Failed to create approval notification:", e);
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Approve milestone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/milestones/:id/reject
  async reject(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid submission ID" });

      const [submission] = await db
        .select()
        .from(milestoneSubmissions)
        .where(eq(milestoneSubmissions.id, id));

      if (!submission) return res.status(404).json({ message: "Submission not found" });

      const project = await projectService.getById(submission.projectId);
      if (!project || project.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await db
        .update(milestoneSubmissions)
        .set({ status: "rejected", reviewedAt: new Date() })
        .where(eq(milestoneSubmissions.id, id));
      const [updated] = await db.select().from(milestoneSubmissions).where(eq(milestoneSubmissions.id, id));

      // Notify the freelancer that their milestone was rejected
      try {
        if (submission.freelancerId) {
          await notificationService.create({
            userId: submission.freelancerId,
            type: "milestone_rejected",
            title: `Milestone ${submission.milestoneNum} Rejected`,
            message: `Your submission for Milestone ${submission.milestoneNum} on "${project.title}" was rejected. Please review feedback and resubmit.`,
            projectId: project.id,
          });
        }
      } catch (e) {
        console.error("Failed to create rejection notification:", e);
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Reject milestone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/milestones/project/:projectId
  async getByProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });

      const submissions = await db
        .select()
        .from(milestoneSubmissions)
        .where(eq(milestoneSubmissions.projectId, projectId));

      return res.status(200).json(submissions);
    } catch (error) {
      console.error("Get milestones error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
