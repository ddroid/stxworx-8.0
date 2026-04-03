import { type Request, type Response } from "express";
import { z } from "zod";
import { refundService } from "../services/refund.service";
import { projectService } from "../services/project.service";

const requestRefundSchema = z.object({
  projectId: z.number().int(),
  reason: z.string().max(2000).optional(),
});

const approveRefundSchema = z.object({
  txId: z.string().min(1).max(100),
  note: z.string().max(2000).optional(),
});

const adminRefundSchema = z.object({
  txId: z.string().min(1).max(100),
  note: z.string().max(2000).optional(),
});

export const refundController = {
  async getStatus(req: Request, res: Response) {
    try {
      const projectId = Number.parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await projectService.getById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const isParticipant = project.clientId === req.user!.id || project.freelancerId === req.user!.id;
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const status = await refundService.getProjectRefundStatus(projectId);
      return res.status(200).json(status);
    } catch (error) {
      console.error("Get refund status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async request(req: Request, res: Response) {
    try {
      const result = requestRefundSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const refund = await refundService.requestRefund(result.data.projectId, req.user!.id, {
        reason: result.data.reason,
      });

      return res.status(201).json(refund);
    } catch (error: any) {
      console.error("Request refund error:", error);
      return res.status(400).json({ message: error.message || "Failed to request refund" });
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      const projectId = Number.parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const refund = await refundService.cancelRefundRequest(projectId, req.user!.id);
      return res.status(200).json(refund);
    } catch (error: any) {
      console.error("Cancel refund error:", error);
      return res.status(400).json({ message: error.message || "Failed to cancel refund request" });
    }
  },

  async approve(req: Request, res: Response) {
    try {
      const projectId = Number.parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = approveRefundSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const refund = await refundService.approveRefund(projectId, req.user!.id, result.data);
      return res.status(200).json(refund);
    } catch (error: any) {
      console.error("Approve refund error:", error);
      return res.status(400).json({ message: error.message || "Failed to approve refund" });
    }
  },

  async adminRefund(req: Request, res: Response) {
    try {
      const projectId = Number.parseInt(req.params.projectId, 10);
      if (Number.isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = adminRefundSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const refund = await refundService.adminRefund(projectId, req.admin!.id, result.data);
      return res.status(200).json(refund);
    } catch (error: any) {
      console.error("Admin refund error:", error);
      return res.status(400).json({ message: error.message || "Failed to execute admin refund" });
    }
  },

  async adminQueue(_req: Request, res: Response) {
    try {
      const queue = await refundService.listAdminRefundQueue();
      return res.status(200).json(queue);
    } catch (error) {
      console.error("Admin refund queue error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
