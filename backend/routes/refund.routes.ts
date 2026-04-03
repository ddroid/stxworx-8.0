import { Router } from "express";
import { refundController } from "../controllers/refund.controller";
import { requireAdmin } from "../middleware/admin-auth";
import { requireAuth } from "../middleware/auth";

export const refundRoutes = Router();

refundRoutes.get("/project/:projectId", requireAuth, refundController.getStatus);
refundRoutes.post("/request", requireAuth, refundController.request);
refundRoutes.patch("/project/:projectId/cancel", requireAuth, refundController.cancel);
refundRoutes.patch("/project/:projectId/approve", requireAuth, refundController.approve);
refundRoutes.get("/admin/queue", requireAdmin, refundController.adminQueue);
refundRoutes.patch("/project/:projectId/admin-refund", requireAdmin, refundController.adminRefund);
