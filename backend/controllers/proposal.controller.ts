import { type Request, type Response } from "express";
import { z } from "zod";
import { proposalService } from "../services/proposal.service";
import { projectService } from "../services/project.service";
import { clearEscrowAcceptanceReceipt, getEscrowAcceptanceReceipt } from "../middleware/x402-escrow-accept";

const createProposalSchema = z.object({
  projectId: z.number().int(),
  coverLetter: z.string().min(1),
  proposedAmount: z.string().regex(/^\d+(\.\d{1,8})?$/).refine((value) => Number(value) > 0),
});

const acceptProposalSchema = z.object({
  escrowTxId: z.string().min(1),
  onChainId: z.number().int(),
});

export const proposalController = {
  // POST /api/proposals
  async create(req: Request, res: Response) {
    try {
      const result = createProposalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      // Verify project exists and is open
      const project = await projectService.getById(result.data.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.status !== "open") return res.status(400).json({ message: "Project is not accepting proposals" });

      const proposal = await proposalService.create({
        projectId: result.data.projectId,
        freelancerId: req.user!.id,
        coverLetter: result.data.coverLetter,
        proposedAmount: result.data.proposedAmount,
      });

      return res.status(201).json(proposal);
    } catch (error: any) {
      if (error.message?.includes("already submitted")) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Create proposal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/proposals/project/:projectId
  async getByProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: "Invalid project ID" });

      // Verify requester owns this project
      const project = await projectService.getById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const proposals = await proposalService.getByProject(projectId);
      return res.status(200).json(proposals);
    } catch (error) {
      console.error("Get proposals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/proposals/my
  async getMy(req: Request, res: Response) {
    try {
      const proposals = await proposalService.getByFreelancer(req.user!.id);
      return res.status(200).json(proposals);
    } catch (error) {
      console.error("Get my proposals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // POST /api/proposals/:id/accept/preflight
  async acceptPreflight(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const payment = res.locals.x402Payment;
      if (!payment?.success) {
        return res.status(400).json({ message: "x402 payment preflight did not complete successfully" });
      }

      const receipt = getEscrowAcceptanceReceipt(req.user!.id, id);
      if (!receipt) {
        return res.status(400).json({ message: "x402 payment receipt was not stored for this proposal" });
      }

      return res.status(200).json({
        success: true,
        payment: {
          payer: receipt.payer,
          transaction: receipt.transaction,
          network: receipt.network,
          expiresAt: new Date(receipt.expiresAt).toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Accept proposal preflight error:", error);
      return res.status(400).json({ message: error.message || "Failed to preflight proposal acceptance payment" });
    }
  },

  // PATCH /api/proposals/:id/accept
  async accept(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const result = acceptProposalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const proposal = await proposalService.getById(id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });

      // Verify requester owns the project
      const project = await projectService.getById(proposal.projectId);
      if (!project || project.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const receipt = getEscrowAcceptanceReceipt(req.user!.id, id);
      if (!receipt) {
        return res.status(402).json({ message: "x402 payment preflight is required before finalizing proposal acceptance" });
      }

      const accepted = await proposalService.acceptWithEscrowFunding(
        id,
        result.data.escrowTxId,
        result.data.onChainId,
      );

      clearEscrowAcceptanceReceipt(req.user!.id, id);
      return res.status(200).json(accepted);
    } catch (error: any) {
      console.error("Accept proposal error:", error);
      return res.status(400).json({ message: error.message || "Failed to accept proposal" });
    }
  },

  // PATCH /api/proposals/:id/reject
  async reject(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const proposal = await proposalService.getById(id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });

      const project = await projectService.getById(proposal.projectId);
      if (!project || project.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const rejected = await proposalService.reject(id);
      return res.status(200).json(rejected);
    } catch (error) {
      console.error("Reject proposal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/proposals/:id/withdraw
  async withdraw(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const proposal = await proposalService.getById(id);
      if (!proposal) return res.status(404).json({ message: "Proposal not found" });
      if (proposal.freelancerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const withdrawn = await proposalService.withdraw(id);
      return res.status(200).json(withdrawn);
    } catch (error) {
      console.error("Withdraw proposal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
