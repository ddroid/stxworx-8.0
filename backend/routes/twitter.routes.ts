import { Router } from "express";
import { twitterController } from "../controllers/twitter.controller";
import { requireAuth, optionalAuth } from "../middleware/auth";

export const twitterRoutes = Router();

// OAuth initiation - redirects to Twitter (requires auth to get userId)
twitterRoutes.get("/", requireAuth, twitterController.initiateAuth);

// OAuth callback - Twitter redirects back here
// Uses optionalAuth because session cookie may not be available after Twitter redirect
// User is identified via the state parameter stored in _tw_oauth cookie
twitterRoutes.get("/callback", optionalAuth, twitterController.handleCallback);

// Disconnect Twitter account
twitterRoutes.delete("/disconnect", requireAuth, twitterController.disconnect);
