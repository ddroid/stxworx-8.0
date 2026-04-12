import { db } from "../db";
import { userSettings } from "@shared/schema";
import { eq, and, ne, isNotNull } from "drizzle-orm";
import { emailService } from "./email.service";

// Token expiry: 24 hours in milliseconds
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const settingsService = {
  async getByUser(userId: number) {
    const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

    if (existing) {
      return existing;
    }

    await db.insert(userSettings).values({ userId });
    const [created] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return created!;
  },

  async update(userId: number, data: {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    messagingOption?: "everyone" | "clients_only" | "connections_only";
    profileVisibility?: "public" | "private";
    email?: string | null;
    twitterHandle?: string | null;
    isTwitterConnected?: boolean;
    twitterVerified?: boolean;
  }) {
    await this.getByUser(userId);

    await db
      .update(userSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));

    const [updated] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return updated!;
  },

  async requestEmailVerification(userId: number, email: string): Promise<{ success: boolean; message: string }> {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already verified by another user
    const [existingWithEmail] = await db
      .select()
      .from(userSettings)
      .where(
        and(
          eq(userSettings.email, normalizedEmail),
          eq(userSettings.emailVerified, true),
          ne(userSettings.userId, userId)
        )
      );

    if (existingWithEmail) {
      return { success: false, message: "This email is already verified by another account" };
    }

    // Generate verification token
    const token = emailService.generateVerificationToken();

    // Store pending email and token
    await db
      .update(userSettings)
      .set({
        email: normalizedEmail,
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));

    // Send verification email
    try {
      await emailService.sendVerificationEmail(normalizedEmail, token);
    } catch (error) {
      console.error("Failed to send verification email:", error);
      // Don't fail the request - user can request resend
      return { success: true, message: "Verification email queued. Please check your inbox shortly." };
    }

    return { success: true, message: "Verification email sent. Please check your inbox." };
  },

  async confirmEmailVerification(token: string): Promise<{ success: boolean; message: string; email?: string }> {
    // Find settings with this token
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.emailVerificationToken, token));

    if (!settings) {
      return { success: false, message: "Invalid or expired verification token" };
    }

    // Check token expiry
    if (settings.emailVerificationSentAt) {
      const sentAt = new Date(settings.emailVerificationSentAt).getTime();
      const now = Date.now();
      if (now - sentAt > TOKEN_EXPIRY_MS) {
        return { success: false, message: "Verification token has expired. Please request a new one." };
      }
    }

    // Mark email as verified and clear token
    await db
      .update(userSettings)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, settings.userId));

    return {
      success: true,
      message: "Email verified successfully",
      email: settings.email || undefined,
    };
  },

  async removeEmail(userId: number): Promise<{ success: boolean; message: string }> {
    await this.getByUser(userId);

    await db
      .update(userSettings)
      .set({
        email: null,
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationSentAt: null,
        emailVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));

    return { success: true, message: "Email removed successfully" };
  },

  async canUseEmailNotifications(userId: number): Promise<boolean> {
    const settings = await this.getByUser(userId);
    return settings.emailVerified === true && settings.email !== null;
  },

  async resendVerificationEmail(userId: number): Promise<{ success: boolean; message: string }> {
    const settings = await this.getByUser(userId);

    if (!settings.email) {
      return { success: false, message: "No email address on file" };
    }

    if (settings.emailVerified) {
      return { success: false, message: "Email is already verified" };
    }

    // Rate limit: minimum 60 seconds between resends
    if (settings.emailVerificationSentAt) {
      const sentAt = new Date(settings.emailVerificationSentAt).getTime();
      const now = Date.now();
      const secondsSinceLastSend = (now - sentAt) / 1000;
      if (secondsSinceLastSend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSend);
        return { success: false, message: `Please wait ${waitSeconds} seconds before requesting another email` };
      }
    }

    // Generate new token and resend
    const token = emailService.generateVerificationToken();

    await db
      .update(userSettings)
      .set({
        emailVerificationToken: token,
        emailVerificationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));

    try {
      await emailService.sendVerificationEmail(settings.email, token);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      return { success: true, message: "Verification email queued. Please check your inbox shortly." };
    }

    return { success: true, message: "Verification email resent. Please check your inbox." };
  },
};
