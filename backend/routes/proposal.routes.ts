import { Router } from "express";
import { proposalController } from "../controllers/proposal.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { x402EscrowAcceptancePaywall } from "../middleware/x402-escrow-accept";

export const proposalRoutes = Router();

// Protected
proposalRoutes.post("/", requireAuth, requireRole("freelancer"), proposalController.create);
proposalRoutes.get("/project/:projectId", requireAuth, proposalController.getByProject);
proposalRoutes.get("/my", requireAuth, proposalController.getMy);
proposalRoutes.get("/:id/accept/status", requireAuth, requireRole("client"), proposalController.acceptStatus);
proposalRoutes.post("/:id/accept/compensation", requireAuth, requireRole("client"), proposalController.recordCompensation);
proposalRoutes.post("/:id/accept/preflight", requireAuth, requireRole("client"), x402EscrowAcceptancePaywall, proposalController.acceptPreflight);
proposalRoutes.patch("/:id/accept", requireAuth, requireRole("client"), proposalController.accept);
proposalRoutes.patch("/:id/reject", requireAuth, proposalController.reject);
proposalRoutes.patch("/:id/withdraw", requireAuth, proposalController.withdraw);
