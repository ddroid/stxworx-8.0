import { type Request, type Response } from "express";
import { db } from "../db";
import { userSettings, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface VerifiedTwitterUser {
  userId: number;
  stxAddress: string;
  username: string | null;
  name: string | null;
  twitterHandle: string;
  twitterVerified: boolean;
  isTwitterConnected: boolean;
  verifiedAt: Date | null;
}

export const verifiedTwitterUsersController = {
  // Get all users with verified Twitter accounts (blue checkmark)
  // This list can be used for NFT minting eligibility
  async getVerifiedUsers(req: Request, res: Response) {
    try {
      const verifiedUsers = await db
        .select({
          userId: users.id,
          stxAddress: users.stxAddress,
          username: users.username,
          name: users.name,
          twitterHandle: userSettings.twitterHandle,
          twitterVerified: userSettings.twitterVerified,
          isTwitterConnected: userSettings.isTwitterConnected,
          verifiedAt: userSettings.updatedAt,
        })
        .from(userSettings)
        .innerJoin(users, eq(userSettings.userId, users.id))
        .where(
          and(
            eq(userSettings.isTwitterConnected, true),
            eq(userSettings.twitterVerified, true)
          )
        );

      return res.status(200).json({
        count: verifiedUsers.length,
        users: verifiedUsers,
      });
    } catch (error) {
      console.error("Get verified Twitter users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all connected Twitter users (regardless of verification status)
  async getAllConnectedUsers(req: Request, res: Response) {
    try {
      const connectedUsers = await db
        .select({
          userId: users.id,
          stxAddress: users.stxAddress,
          username: users.username,
          name: users.name,
          twitterHandle: userSettings.twitterHandle,
          twitterVerified: userSettings.twitterVerified,
          isTwitterConnected: userSettings.isTwitterConnected,
          connectedAt: userSettings.updatedAt,
        })
        .from(userSettings)
        .innerJoin(users, eq(userSettings.userId, users.id))
        .where(eq(userSettings.isTwitterConnected, true));

      return res.status(200).json({
        count: connectedUsers.length,
        verifiedCount: connectedUsers.filter((u) => u.twitterVerified).length,
        users: connectedUsers,
      });
    } catch (error) {
      console.error("Get connected Twitter users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // Check if a specific user is verified (public endpoint)
  async checkUserVerification(req: Request, res: Response) {
    try {
      const { stxAddress } = req.params;

      if (!stxAddress) {
        return res.status(400).json({ message: "STX address required" });
      }

      const [userWithSettings] = await db
        .select({
          userId: users.id,
          stxAddress: users.stxAddress,
          username: users.username,
          name: users.name,
          twitterHandle: userSettings.twitterHandle,
          twitterVerified: userSettings.twitterVerified,
          isTwitterConnected: userSettings.isTwitterConnected,
        })
        .from(users)
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .where(eq(users.stxAddress, stxAddress));

      if (!userWithSettings) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        isConnected: userWithSettings.isTwitterConnected ?? false,
        isVerified: userWithSettings.twitterVerified ?? false,
        twitterHandle: userWithSettings.twitterHandle,
        isEligibleForNft:
          userWithSettings.isTwitterConnected && userWithSettings.twitterVerified,
      });
    } catch (error) {
      console.error("Check user verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get verified user stats (for admin/NFT minting dashboard)
  async getVerifiedStats(req: Request, res: Response) {
    try {
      const allSettings = await db
        .select({
          isTwitterConnected: userSettings.isTwitterConnected,
          twitterVerified: userSettings.twitterVerified,
        })
        .from(userSettings);

      const stats = {
        totalUsers: allSettings.length,
        connectedUsers: allSettings.filter((s) => s.isTwitterConnected).length,
        verifiedUsers: allSettings.filter(
          (s) => s.isTwitterConnected && s.twitterVerified
        ).length,
        pendingVerification: allSettings.filter(
          (s) => s.isTwitterConnected && !s.twitterVerified
        ).length,
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error("Get verified stats error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
