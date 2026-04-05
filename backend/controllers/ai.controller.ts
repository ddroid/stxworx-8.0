import { type Request, type Response } from "express";
import { z } from "zod";
import { aiService } from "../services/ai.service";

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1),
  systemInstruction: z.string().trim().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().trim().min(1).optional(),
});

export const aiController = {
  async generateText(req: Request, res: Response) {
    try {
      const result = generateTextSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const generated = await aiService.generateText(result.data);
      return res.status(200).json(generated);
    } catch (error: any) {
      const status = error?.status || 500;
      const message = error?.message || "Internal server error";
      console.error("AI generate error:", error);
      return res.status(status).json({ message });
    }
  },
};
