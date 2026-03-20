import { type Request, type Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, reviews, projects } from "@shared/schema";
import { eq, sql, and, count, avg, ne } from "drizzle-orm";
import { projectService } from "../services/project.service";
import { saveUploadedImage } from "../services/social-image.service";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

const usernameAvailabilitySchema = z.object({
  username: usernameSchema,
});

const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  name: z.string().trim().max(150).optional(),
  specialty: z.string().trim().max(100).optional(),
  hourlyRate: z.string().trim().max(20).optional(),
  about: z.string().max(2000).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  portfolio: z.array(z.string().url()).max(20).optional(),
  company: z.string().trim().max(150).optional(),
  projectInterests: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  avatar: z.string().max(200000).optional(),
  coverImage: z.string().max(200000).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  language: z.string().trim().max(100).optional(),
});

const publicProfileSelection = {
  id: users.id,
  stxAddress: users.stxAddress,
  username: users.username,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  totalEarned: users.totalEarned,
  specialty: users.specialty,
  hourlyRate: users.hourlyRate,
  about: users.about,
  skills: users.skills,
  portfolio: users.portfolio,
  company: users.company,
  projectInterests: users.projectInterests,
  avatar: users.avatar,
  coverImage: users.coverImage,
  city: users.city,
  country: users.country,
  language: users.language,
  createdAt: users.createdAt,
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeStringArray(values?: string[]) {
  if (!values) {
    return undefined;
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function findProfileByAddress(address: string) {
  const [user] = await db.select(publicProfileSelection).from(users).where(eq(users.stxAddress, address));
  return user;
}

async function findProfileByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const [user] = await db
    .select(publicProfileSelection)
    .from(users)
    .where(sql`lower(${users.username}) = ${normalizedUsername}`);
  return user;
}

async function findIdentityByAddress(address: string) {
  const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.stxAddress, address));
  return user;
}

async function isUsernameAvailable(username: string, currentUserId?: number) {
  const normalizedUsername = normalizeUsername(username);
  const whereClause = currentUserId
    ? and(sql`lower(${users.username}) = ${normalizedUsername}`, ne(users.id, currentUserId))
    : sql`lower(${users.username}) = ${normalizedUsername}`;

  const [existing] = await db.select({ id: users.id }).from(users).where(whereClause);
  return !existing;
}

async function persistImageValue(value: string | undefined, directory: string) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:image/")) {
    return saveUploadedImage(trimmed, directory);
  }

  return trimmed;
}

function buildMissingAddressProfile(address: string) {
  return {
    id: 0,
    stxAddress: address,
    username: null,
    name: null,
    role: null,
    isActive: false,
    totalEarned: "0",
    specialty: null,
    hourlyRate: null,
    about: null,
    skills: null,
    portfolio: null,
    company: null,
    projectInterests: null,
    avatar: null,
    coverImage: null,
    city: null,
    country: null,
    language: null,
    createdAt: null,
  };
}

export const userController = {
  async getByAddress(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const user = await findProfileByAddress(address);

      if (!user) {
        return res.status(200).json(buildMissingAddressProfile(address));
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Get user by address error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getByUsername(req: Request, res: Response) {
    try {
      const result = usernameSchema.safeParse(req.params.username);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid username", errors: result.error.errors });
      }

      const user = await findProfileByUsername(result.data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Get user by username error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async checkUsernameAvailability(req: Request, res: Response) {
    try {
      const result = usernameAvailabilitySchema.safeParse({ username: req.query.username });
      if (!result.success) {
        return res.status(400).json({ message: "Invalid username", errors: result.error.errors });
      }

      const normalizedUsername = normalizeUsername(result.data.username);
      const available = await isUsernameAvailable(normalizedUsername, req.user?.id);

      return res.status(200).json({
        username: normalizedUsername,
        available,
      });
    } catch (error) {
      console.error("Username availability error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async updateMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      if (result.data.username) {
        const available = await isUsernameAvailable(result.data.username, req.user.id);
        if (!available) {
          return res.status(409).json({
            message: "Another user already has this username",
            code: "USERNAME_TAKEN",
          });
        }
      }

      const avatar = await persistImageValue(result.data.avatar, "profile-images");
      const coverImage = await persistImageValue(result.data.coverImage, "profile-covers");

      await db
        .update(users)
        .set({
          ...(result.data.username !== undefined ? { username: normalizeUsername(result.data.username) } : {}),
          ...(result.data.name !== undefined ? { name: result.data.name.trim() } : {}),
          ...(result.data.specialty !== undefined ? { specialty: result.data.specialty.trim() } : {}),
          ...(result.data.hourlyRate !== undefined ? { hourlyRate: result.data.hourlyRate.trim() } : {}),
          ...(result.data.about !== undefined ? { about: result.data.about } : {}),
          ...(result.data.skills !== undefined ? { skills: normalizeStringArray(result.data.skills) } : {}),
          ...(result.data.portfolio !== undefined ? { portfolio: normalizeStringArray(result.data.portfolio) } : {}),
          ...(result.data.company !== undefined ? { company: result.data.company.trim() } : {}),
          ...(result.data.projectInterests !== undefined ? { projectInterests: normalizeStringArray(result.data.projectInterests) } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(coverImage !== undefined ? { coverImage } : {}),
          ...(result.data.city !== undefined ? { city: result.data.city.trim() } : {}),
          ...(result.data.country !== undefined ? { country: result.data.country.trim() } : {}),
          ...(result.data.language !== undefined ? { language: result.data.language.trim() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id));

      const [updated] = await db.select(publicProfileSelection).from(users).where(eq(users.id, req.user.id));

      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Duplicate entry") && error.message.includes("username")) {
        return res.status(409).json({
          message: "Another user already has this username",
          code: "USERNAME_TAKEN",
        });
      }

      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getReviews(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const user = await findIdentityByAddress(address);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userReviews = await db.select().from(reviews).where(eq(reviews.revieweeId, user.id));
      return res.status(200).json(userReviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getProjectsByAddress(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const user = await findIdentityByAddress(address);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userProjects = user.role === "client"
        ? await projectService.getByClientId(user.id)
        : await projectService.getByFreelancerId(user.id);

      const withBudget = userProjects.map((project) => ({
        ...project,
        budget: projectService.computeBudget(project),
      }));

      return res.status(200).json(withBudget);
    } catch (error) {
      console.error("Get user projects error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  async getLeaderboard(_req: Request, res: Response) {
    try {
      const freelancers = await db
        .select({
          id: users.id,
          stxAddress: users.stxAddress,
          name: users.name,
          username: users.username,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.role, "freelancer"), eq(users.isActive, true)));

      const leaderboard = await Promise.all(
        freelancers.map(async (freelancer) => {
          const [completedResult] = await db
            .select({ count: count() })
            .from(projects)
            .where(and(eq(projects.freelancerId, freelancer.id), eq(projects.status, "completed")));

          const [ratingResult] = await db
            .select({ avgRating: avg(reviews.rating) })
            .from(reviews)
            .where(eq(reviews.revieweeId, freelancer.id));

          const [reviewCountResult] = await db
            .select({ count: count() })
            .from(reviews)
            .where(eq(reviews.revieweeId, freelancer.id));

          return {
            id: freelancer.id,
            stxAddress: freelancer.stxAddress,
            name: freelancer.name,
            username: freelancer.username,
            jobsCompleted: completedResult?.count ?? 0,
            avgRating: ratingResult?.avgRating ? parseFloat(String(ratingResult.avgRating)) : 0,
            reviewCount: reviewCountResult?.count ?? 0,
            createdAt: freelancer.createdAt,
          };
        })
      );

      leaderboard.sort((left, right) => {
        if (right.jobsCompleted !== left.jobsCompleted) {
          return right.jobsCompleted - left.jobsCompleted;
        }

        return right.avgRating - left.avgRating;
      });

      const ranked = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      return res.status(200).json(ranked);
    } catch (error) {
      console.error("Leaderboard error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
