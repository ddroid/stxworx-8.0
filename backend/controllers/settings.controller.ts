import { type Request, type Response } from "express";
import { z } from "zod";
import { settingsService } from "../services/settings.service";

const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  messagingOption: z.enum(["everyone", "clients_only", "connections_only"]).optional(),
  profileVisibility: z.enum(["public", "private"]).optional(),
  twitterHandle: z.string().max(100).optional(),
  isTwitterConnected: z.boolean().optional(),
  twitterVerified: z.boolean().optional(),
  // Note: email is no longer directly updatable - use email verification flow
});

const emailVerificationRequestSchema = z.object({
  email: z.string().email(),
});

const emailVerificationConfirmSchema = z.object({
  token: z.string().min(1),
});

export const settingsController = {
  async getMe(req: Request, res: Response) {
    try {
      const settings = await settingsService.getByUser(req.user!.id);
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateMe(req: Request, res: Response) {
    try {
      const result = updateSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const currentSettings = await settingsService.getByUser(req.user!.id);

      // If trying to enable email notifications without verified email, reject
      if (result.data.emailNotifications === true && !currentSettings.emailVerified) {
        return res.status(400).json({
          message: "Cannot enable email notifications without a verified email address",
        });
      }

      const updated = await settingsService.update(req.user!.id, {
        ...result.data,
        twitterHandle: result.data.twitterHandle?.trim() || null,
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Update settings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async requestEmailVerification(req: Request, res: Response) {
    try {
      const result = emailVerificationRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const result2 = await settingsService.requestEmailVerification(req.user!.id, result.data.email);

      if (result2.success) {
        return res.status(200).json({ message: result2.message });
      } else {
        return res.status(400).json({ message: result2.message });
      }
    } catch (error) {
      console.error("Request email verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async resendEmailVerification(req: Request, res: Response) {
    try {
      const result = await settingsService.resendVerificationEmail(req.user!.id);

      if (result.success) {
        return res.status(200).json({ message: result.message });
      } else {
        return res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Resend email verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async confirmEmailVerification(req: Request, res: Response) {
    try {
      const result = emailVerificationConfirmSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const result2 = await settingsService.confirmEmailVerification(result.data.token);

      if (result2.success) {
        return res.status(200).json({
          message: result2.message,
          email: result2.email,
        });
      } else {
        return res.status(400).json({ message: result2.message });
      }
    } catch (error) {
      console.error("Confirm email verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async removeEmail(req: Request, res: Response) {
    try {
      const result = await settingsService.removeEmail(req.user!.id);

      if (result.success) {
        return res.status(200).json({ message: result.message });
      } else {
        return res.status(400).json({ message: result.message });
      }
    } catch (error) {
      console.error("Remove email error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
