import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/admin-auth";
import rateLimit from "express-rate-limit";

export const adminRoutes = Router();

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public admin auth
adminRoutes.post("/login", adminLoginLimiter, adminController.login);
adminRoutes.post("/logout", adminController.logout);

// Protected admin routes
adminRoutes.get("/me", requireAdmin, adminController.me);

// Dashboard
adminRoutes.get("/dashboard", requireAdmin, adminController.dashboard);
adminRoutes.get("/config", requireAdmin, adminController.getPlatformConfig);
adminRoutes.patch("/config", requireAdmin, adminController.updatePlatformConfig);

// Projects
adminRoutes.get("/projects", requireAdmin, adminController.getAllProjects);
adminRoutes.get("/projects/:id", requireAdmin, adminController.getProjectDetail);

// Disputes
adminRoutes.get("/disputes", requireAdmin, adminController.getAllDisputes);
adminRoutes.patch("/disputes/:id/resolve", requireAdmin, adminController.resolveDispute);
adminRoutes.patch("/disputes/:id/reset", requireAdmin, adminController.resetDispute);

// Recovery
adminRoutes.get("/recovery/abandoned", requireAdmin, adminController.getAbandoned);
adminRoutes.patch("/recovery/force-release", requireAdmin, adminController.forceRelease);
adminRoutes.patch("/recovery/force-refund", requireAdmin, adminController.forceRefund);

// Users
adminRoutes.get("/users", requireAdmin, adminController.getAllUsers);
adminRoutes.patch("/users/:id/status", requireAdmin, adminController.updateUserStatus);

// NFTs
adminRoutes.post("/nfts", requireAdmin, adminController.createNft);
adminRoutes.get("/nfts", requireAdmin, adminController.getAllNfts);
adminRoutes.patch("/nfts/:id/confirm-mint", requireAdmin, adminController.confirmMint);
adminRoutes.get("/nfts/user/:userId", requireAdmin, adminController.getNftsByUser);

// Referrals
adminRoutes.get("/referrals", requireAdmin, adminController.getReferralsByUsername);
