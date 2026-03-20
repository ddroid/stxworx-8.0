import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { socialController } from "../controllers/social.controller";

export const socialRoutes = Router();

socialRoutes.get("/feed", optionalAuth, socialController.feed);
socialRoutes.get("/posts/:id", optionalAuth, socialController.getById);
socialRoutes.get("/posts/:id/comments", optionalAuth, socialController.listComments);
socialRoutes.get("/:address/posts", optionalAuth, socialController.listByAddress);
socialRoutes.post("/posts", requireAuth, socialController.create);
socialRoutes.post("/posts/:id/comments", requireAuth, socialController.createComment);
socialRoutes.patch("/posts/:id/like", requireAuth, socialController.toggleLike);
