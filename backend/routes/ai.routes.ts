import { Router } from "express";
import { aiController } from "../controllers/ai.controller";

export const aiRoutes = Router();

aiRoutes.post("/generate", aiController.generateText);
