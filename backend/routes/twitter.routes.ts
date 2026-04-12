import { Router } from "express";
import { twitterController } from "../controllers/twitter.controller";
import { requireAuth } from "../middleware/auth";

export const twitterRoutes = Router();

// OAuth initiation - redirects to Twitter
twitterRoutes.get("/", requireAuth, twitterController.initiateAuth);

// OAuth callback - Twitter redirects back here
twitterRoutes.get("/callback", requireAuth, twitterController.handleCallback);

// Disconnect Twitter account
twitterRoutes.delete("/disconnect", requireAuth, twitterController.disconnect);
