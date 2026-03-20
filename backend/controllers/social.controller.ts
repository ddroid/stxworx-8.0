import { type Request, type Response } from "express";
import { z } from "zod";
import { socialService } from "../services/social.service";
import { saveSocialPostImage } from "../services/social-image.service";

 const feedQuerySchema = z.object({
   limit: z.coerce.number().int().min(1).max(20).optional(),
 });

 const postIdSchema = z.coerce.number().int().positive();

const createPostSchema = z
  .object({
    content: z.string().max(4000).optional().default(""),
    imageDataUrl: z.string().optional(),
  })
  .refine((value) => value.content.trim().length > 0 || Boolean(value.imageDataUrl), {
    message: "Post content or image is required",
    path: ["content"],
  });

 const createCommentSchema = z.object({
   content: z.string().trim().min(1).max(2000),
 });

export const socialController = {
  async feed(req: Request, res: Response) {
    try {
      const query = feedQuerySchema.safeParse(req.query);
      if (!query.success) {
        return res.status(400).json({ message: "Validation error", errors: query.error.errors });
      }

      const posts = await socialService.getFeed(req.user?.id, query.data.limit ?? 12);
      return res.status(200).json(posts);
    } catch (error) {
      console.error("Feed posts error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const result = postIdSchema.safeParse(req.params.id);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const post = await socialService.getById(result.data, req.user?.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      return res.status(200).json(post);
    } catch (error) {
      console.error("Get post error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async listByAddress(req: Request, res: Response) {
    try {
      const userId = await socialService.getUserIdByAddress(req.params.address);
      if (!userId) {
        return res.status(404).json({ message: "User not found" });
      }

      const posts = await socialService.getByUserId(userId, req.user?.id);
      return res.status(200).json(posts);
    } catch (error) {
      console.error("List posts error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const result = createPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      let imageUrl: string | undefined;

      if (result.data.imageDataUrl) {
        try {
          imageUrl = await saveSocialPostImage(result.data.imageDataUrl);
        } catch (error) {
          return res.status(400).json({
            message: error instanceof Error ? error.message : "Invalid image upload",
          });
        }
      }

      const created = await socialService.create(req.user!.id, result.data.content.trim(), imageUrl);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Create post error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async listComments(req: Request, res: Response) {
    try {
      const result = postIdSchema.safeParse(req.params.id);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const comments = await socialService.listComments(result.data);
      if (!comments) {
        return res.status(404).json({ message: "Post not found" });
      }

      return res.status(200).json(comments);
    } catch (error) {
      console.error("List comments error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async createComment(req: Request, res: Response) {
    try {
      const postIdResult = postIdSchema.safeParse(req.params.id);
      if (!postIdResult.success) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const bodyResult = createCommentSchema.safeParse(req.body);
      if (!bodyResult.success) {
        return res.status(400).json({ message: "Validation error", errors: bodyResult.error.errors });
      }

      const created = await socialService.createComment(postIdResult.data, req.user!.id, bodyResult.data.content);
      if (!created) {
        return res.status(404).json({ message: "Post not found" });
      }

      return res.status(201).json(created);
    } catch (error) {
      console.error("Create comment error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async toggleLike(req: Request, res: Response) {
    try {
      const result = postIdSchema.safeParse(req.params.id);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const updated = await socialService.toggleLike(result.data, req.user!.id);
      if (!updated) {
        return res.status(404).json({ message: "Post not found" });
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Toggle like error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
