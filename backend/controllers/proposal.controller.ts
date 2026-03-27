import { type Request, type Response } from "express";
import { z } from "zod";
import { proposalService } from "../services/proposal.service";
import { projectService } from "../services/project.service";
import { platformSettingsService } from "../services/platform-settings.service";
import { proposalAcceptanceService } from "../services/proposal-acceptance.service";
import { stacksTransactionService } from "../services/stacks-transaction.service";

const createProposalSchema = z.object({
  projectId: z.number().int(),
  coverLetter: z.string().min(1),
  proposedAmount: z.string().regex(/^\d+(\.\d{1,8})?$/).refine((value) => Number(value) > 0),
});

const recordCompensationSchema = z.object({
  escrowTxId: z.string().min(1),
  onChainId: z.number().int(),
});

async function getAcceptanceContext(userId: number, proposalId: number) {
  const proposal = await proposalService.getById(proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const project = await projectService.getById(proposal.projectId);
  if (!project || project.clientId !== userId) {
    throw new Error("Not authorized");
  }

  const platformConfig = await platformSettingsService.get();
  const progress = await proposalAcceptanceService.ensureForProposal({
    proposalId: proposal.id,
    projectId: project.id,
    clientId: project.clientId,
    proposedAmount: proposal.proposedAmount,
    feePercentage: platformConfig.daoFeePercentage,
  });

  return {
    proposal,
    project,
    platformConfig,
    progress,
  };
}

async function refreshCompensationProgress(
  proposalId: number,
  project: Awaited<ReturnType<typeof projectService.getById>>,
  progress: Awaited<ReturnType<typeof proposalAcceptanceService.getByProposalId>>,
  clientAddress: string,
) {
  if (!project || !progress?.compensationTxId || progress.compensationStatus === "confirmed") {
    return progress;
  }

  const verification = await stacksTransactionService.verifyEscrowCreateProjectTx({
    txId: progress.compensationTxId,
    tokenType: project.tokenType,
    expectedSenderAddress: clientAddress,
    expectedOnChainId: progress.compensationOnChainId,
  });

  return proposalAcceptanceService.updateCompensation(proposalId, {
    txId: progress.compensationTxId,
    onChainId: verification.onChainId ?? progress.compensationOnChainId,
    status: verification.status,
    error: verification.error,
    verifiedAt: verification.status === "confirmed" ? new Date() : null,
    lastCheckedAt: new Date(),
  });
}

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

  // GET /api/proposals/:id/accept/status
  async acceptStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const context = await getAcceptanceContext(req.user!.id, id);
      const refreshedProgress = await refreshCompensationProgress(
        id,
        context.project,
        context.progress,
        req.user!.stxAddress,
      );

      return res.status(200).json({
        success: true,
        progress: proposalAcceptanceService.serialize(refreshedProgress),
      });
    } catch (error: any) {
      console.error("Get proposal acceptance status error:", error);
      return res.status(error.message === "Not authorized" ? 403 : 400).json({ message: error.message || "Failed to load proposal acceptance status" });
    }
  },

  // POST /api/proposals/:id/accept/compensation
  async recordCompensation(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid proposal ID" });

      const result = recordCompensationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const context = await getAcceptanceContext(req.user!.id, id);
      if (context.progress.compensationStatus === "confirmed") {
        return res.status(200).json({
          success: true,
          progress: proposalAcceptanceService.serialize(context.progress),
        });
      }

      const submittedProgress = await proposalAcceptanceService.updateCompensation(id, {
        txId: result.data.escrowTxId,
        onChainId: result.data.onChainId,
        status: "pending",
        error: null,
        verifiedAt: null,
        lastCheckedAt: new Date(),
      });

      const refreshedProgress = await refreshCompensationProgress(
        id,
        context.project,
        submittedProgress,
        req.user!.stxAddress,
      );

      return res.status(200).json({
        success: refreshedProgress?.compensationStatus === "confirmed",
        progress: proposalAcceptanceService.serialize(refreshedProgress),
      });
    } catch (error: any) {
      console.error("Record compensation payment error:", error);
      return res.status(error.message === "Not authorized" ? 403 : 400).json({ message: error.message || "Failed to record compensation payment" });
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

      const context = await getAcceptanceContext(req.user!.id, id);
      const progress = await proposalAcceptanceService.getByProposalId(id);
      if (!progress || progress.platformFeeStatus !== "confirmed") {
        return res.status(400).json({ message: "x402 payment receipt was not stored for this proposal" });
      }

      return res.status(200).json({
        success: true,
        payment: {
          payer: progress.platformFeePayer,
          transaction: progress.platformFeeTxId,
          network: progress.platformFeeNetwork,
          expiresAt: progress.platformFeeExpiresAt?.toISOString() || null,
        },
        progress: proposalAcceptanceService.serialize(progress),
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

      const context = await getAcceptanceContext(req.user!.id, id);
      const refreshedProgress = await refreshCompensationProgress(
        id,
        context.project,
        context.progress,
        req.user!.stxAddress,
      );

      if (!refreshedProgress || refreshedProgress.platformFeeStatus !== "confirmed") {
        return res.status(402).json({ message: "x402 payment preflight is required before finalizing proposal acceptance" });
      }

      if (refreshedProgress.compensationStatus !== "confirmed") {
        return res.status(409).json({ message: refreshedProgress.compensationError || "Escrow contract call has not been verified yet" });
      }

      if (!refreshedProgress.compensationTxId || !refreshedProgress.compensationOnChainId) {
        return res.status(409).json({ message: "Verified escrow transaction details are missing" });
      }

      const accepted = await proposalService.acceptWithEscrowFunding(
        id,
        refreshedProgress.compensationTxId,
        refreshedProgress.compensationOnChainId,
      );

      await proposalAcceptanceService.markFinalized(id);
      return res.status(200).json(accepted);
    } catch (error: any) {
      console.error("Accept proposal error:", error);
      return res.status(error.message === "Not authorized" ? 403 : 400).json({ message: error.message || "Failed to accept proposal" });
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
