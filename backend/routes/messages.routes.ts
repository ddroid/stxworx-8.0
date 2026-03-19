import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { messagesController } from "../controllers/messages.controller";

export const messagesRoutes = Router();

messagesRoutes.get("/conversations", requireAuth, messagesController.listConversations);
messagesRoutes.get("/unread-count", requireAuth, messagesController.unreadCount);
messagesRoutes.post("/conversations", requireAuth, messagesController.startConversation);
messagesRoutes.get("/conversations/:id/messages", requireAuth, messagesController.getMessages);
messagesRoutes.post("/conversations/:id/messages", requireAuth, messagesController.sendMessage);
