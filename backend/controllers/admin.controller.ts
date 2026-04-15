import { type Request, type Response } from "express";
import { z } from "zod";
import { adminAuthService } from "../services/admin-auth.service";
import { adminService } from "../services/admin.service";
import { getAdminCookieName } from "../middleware/admin-auth";
import { platformSettingsService } from "../services/platform-settings.service";
import { referralService } from "../services/referral.service";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const resolveDisputeSchema = z.object({
  resolution: z.string().min(1),
  resolutionTxId: z.string().min(1),
  favorFreelancer: z.boolean(),
});

const forceReleaseSchema = z.object({
  projectId: z.number().int(),
  milestoneNum: z.number().int().min(1).max(4),
  txId: z.string().min(1),
});

const forceRefundSchema = z.object({
  projectId: z.number().int(),
  txId: z.string().min(1),
});

const createNftSchema = z.object({
  recipientId: z.number().int(),
  nftType: z.enum(["milestone_streak", "top_freelancer", "top_client", "loyalty", "custom"]),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  metadataUrl: z.string().url().max(500).optional(),
});

const confirmMintSchema = z.object({
  mintTxId: z.string().min(1),
});

const updatePlatformConfigSchema = z.object({
  daoFeePercentage: z.string().optional(),
  daoWalletAddress: z.string().max(255).optional().or(z.literal("")),
});

export const adminController = {
  // POST /api/admin/login
  async login(req: Request, res: Response) {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const { admin, token } = await adminAuthService.login(result.data.username, result.data.password);

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie(getAdminCookieName(), token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).json({ message: "Login successful", admin });
    } catch (error: any) {
      if (error.message === "Invalid credentials") {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      console.error("Admin login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // POST /api/admin/logout
  async logout(_req: Request, res: Response) {
    res.clearCookie(getAdminCookieName(), {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    return res.status(200).json({ message: "Logout successful" });
  },

  // GET /api/admin/me
  async me(req: Request, res: Response) {
    try {
      if (!req.admin) return res.status(401).json({ message: "Not authenticated" });
      const admin = await adminAuthService.getAdminById(req.admin.id);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      return res.status(200).json({ admin });
    } catch (error) {
      console.error("Admin me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/dashboard
  async dashboard(_req: Request, res: Response) {
    try {
      const data = await adminService.getDashboard();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Dashboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getPlatformConfig(_req: Request, res: Response) {
    try {
      const config = await platformSettingsService.get();
      return res.status(200).json(config);
    } catch (error) {
      console.error("Get platform config error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async updatePlatformConfig(req: Request, res: Response) {
    try {
      const result = updatePlatformConfigSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const updated = await platformSettingsService.update({
        daoFeePercentage: result.data.daoFeePercentage,
        daoWalletAddress: result.data.daoWalletAddress || null,
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error("Update platform config error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/projects
  async getAllProjects(req: Request, res: Response) {
    try {
      const { status, search } = req.query;
      const projects = await adminService.getAllProjects({
        status: status as string,
        search: search as string,
      });
      return res.status(200).json(projects);
    } catch (error) {
      console.error("Admin get projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/projects/:id
  async getProjectDetail(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });

      const detail = await adminService.getProjectDetail(id);
      if (!detail) return res.status(404).json({ message: "Project not found" });

      return res.status(200).json(detail);
    } catch (error) {
      console.error("Admin project detail error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/disputes
  async getAllDisputes(_req: Request, res: Response) {
    try {
      const allDisputes = await adminService.getAllDisputes();
      return res.status(200).json(allDisputes);
    } catch (error) {
      console.error("Admin get disputes error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/disputes/:id/resolve
  async resolveDispute(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid dispute ID" });

      const result = resolveDisputeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const resolved = await adminService.resolveDispute(id, req.admin!.id, result.data);
      if (!resolved) return res.status(404).json({ message: "Dispute not found" });

      return res.status(200).json(resolved);
    } catch (error) {
      console.error("Resolve dispute error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/disputes/:id/reset
  async resetDispute(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid dispute ID" });

      const result = resolveDisputeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const reset = await adminService.resetDispute(id, req.admin!.id, result.data);
      if (!reset) return res.status(404).json({ message: "Dispute not found" });

      return res.status(200).json(reset);
    } catch (error) {
      console.error("Reset dispute error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/recovery/abandoned
  async getAbandoned(_req: Request, res: Response) {
    try {
      const abandoned = await adminService.getAbandonedProjects();
      return res.status(200).json(abandoned);
    } catch (error) {
      console.error("Get abandoned error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/recovery/force-release
  async forceRelease(req: Request, res: Response) {
    try {
      const result = forceReleaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const released = await adminService.forceRelease(result.data);
      return res.status(200).json(released);
    } catch (error) {
      console.error("Force release error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/recovery/force-refund
  async forceRefund(req: Request, res: Response) {
    try {
      const result = forceRefundSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const refunded = await adminService.forceRefund(result.data);
      return res.status(200).json(refunded);
    } catch (error) {
      console.error("Force refund error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/users
  async getAllUsers(_req: Request, res: Response) {
    try {
      const allUsers = await adminService.getAllUsers();
      return res.status(200).json(allUsers);
    } catch (error) {
      console.error("Admin get users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/users/:id/status
  async updateUserStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid user ID" });

      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const updated = await adminService.updateUserStatus(id, isActive);
      if (!updated) return res.status(404).json({ message: "User not found" });

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Update user status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // POST /api/admin/nfts
  async createNft(req: Request, res: Response) {
    try {
      const result = createNftSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const nft = await adminService.createNft({
        ...result.data,
        issuedBy: req.admin!.id,
      });

      return res.status(201).json(nft);
    } catch (error) {
      console.error("Create NFT error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/nfts
  async getAllNfts(req: Request, res: Response) {
    try {
      const { nftType, minted } = req.query;
      const nfts = await adminService.getAllNfts({
        nftType: nftType as string,
        minted: minted === "true" ? true : minted === "false" ? false : undefined,
      });
      return res.status(200).json(nfts);
    } catch (error) {
      console.error("Get NFTs error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // PATCH /api/admin/nfts/:id/confirm-mint
  async confirmMint(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid NFT ID" });

      const result = confirmMintSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const updated = await adminService.confirmNftMint(id, result.data.mintTxId);
      if (!updated) return res.status(404).json({ message: "NFT not found" });

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Confirm mint error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/nfts/user/:userId
  async getNftsByUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ message: "Invalid user ID" });

      const nfts = await adminService.getNftsByUser(userId);
      return res.status(200).json(nfts);
    } catch (error) {
      console.error("Get user NFTs error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // GET /api/admin/referrals?username=:username
  async getReferralsByUsername(req: Request, res: Response) {
    try {
      const { username } = req.query;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "Username query parameter is required" });
      }

      const result = await referralService.getReferralsByUsername(username.trim());
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get referrals by username error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
