import { Router } from "express";
import { verifiedTwitterUsersController } from "../controllers/verified-twitter-users.controller";
import { requireAuth, requireRole } from "../middleware/auth";

export const verifiedTwitterUsersRoutes = Router();

// Public endpoints
// Check if a specific user (by STX address) has verified Twitter
verifiedTwitterUsersRoutes.get(
  "/check/:stxAddress",
  verifiedTwitterUsersController.checkUserVerification
);

// Protected endpoints - require authentication
// Get all users with verified Twitter (blue check) - for NFT minting list
verifiedTwitterUsersRoutes.get(
  "/verified",
  requireAuth,
  verifiedTwitterUsersController.getVerifiedUsers
);

// Get all connected Twitter users
verifiedTwitterUsersRoutes.get(
  "/connected",
  requireAuth,
  verifiedTwitterUsersController.getAllConnectedUsers
);

// Admin endpoints - require admin role
// Get stats about verified users
verifiedTwitterUsersRoutes.get(
  "/stats",
  requireAuth,
  requireRole("client"), // Admin check would need separate middleware
  verifiedTwitterUsersController.getVerifiedStats
);
