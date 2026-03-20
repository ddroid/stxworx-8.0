import {
  mysqlTable,
  varchar,
  text,
  boolean,
  decimal,
  int,
  bigint,
  timestamp,
  mysqlEnum,
  json,
} from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enum value constants (reusable, type-safe)
export const USER_ROLES = ["client", "freelancer"] as const;
export const TOKEN_TYPES = ["STX", "sBTC", "USDCx"] as const;
export const PROJECT_STATUSES = [
  "open",
  "active",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
] as const;
export const PROPOSAL_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export const MILESTONE_SUBMISSION_STATUSES = [
  "submitted",
  "approved",
  "rejected",
  "disputed",
] as const;
export const DISPUTE_STATUSES = [
  "open",
  "resolved",
  "reset",
] as const;
export const NFT_TYPES = [
  "milestone_streak",
  "top_freelancer",
  "top_client",
  "loyalty",
  "custom",
] as const;
export const MESSAGE_VISIBILITIES = [
  "everyone",
  "clients_only",
  "connections_only",
] as const;
export const PROFILE_VISIBILITIES = [
  "public",
  "private",
] as const;
export const CONNECTION_STATUSES = [
  "pending",
  "accepted",
  "declined",
] as const;
export const BOUNTY_STATUSES = [
  "open",
  "completed",
  "cancelled",
] as const;
export const BOUNTY_SUBMISSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

// Tables

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  stxAddress: varchar("stx_address", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 100 }).unique(),
  name: varchar("name", { length: 150 }),
  role: mysqlEnum("role", [...USER_ROLES]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  totalEarned: decimal("total_earned", { precision: 18, scale: 8 }).default("0").notNull(),
  specialty: varchar("specialty", { length: 100 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  about: text("about"),
  skills: json("skills").$type<string[]>(),
  portfolio: json("portfolio").$type<string[]>(),
  company: varchar("company", { length: 150 }),
  projectInterests: json("project_interests").$type<string[]>(),
  avatar: text("avatar"),
  coverImage: text("cover_image"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  language: varchar("language", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const admins = mysqlTable("admins", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  clientId: bigint("client_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  tokenType: mysqlEnum("token_type", [...TOKEN_TYPES]).notNull(),
  numMilestones: int("num_milestones").notNull(),
  milestone1Title: varchar("milestone_1_title", { length: 200 }).notNull(),
  milestone1Description: text("milestone_1_description"),
  milestone1Amount: decimal("milestone_1_amount", { precision: 18, scale: 8 }).notNull(),
  milestone2Title: varchar("milestone_2_title", { length: 200 }),
  milestone2Description: text("milestone_2_description"),
  milestone2Amount: decimal("milestone_2_amount", { precision: 18, scale: 8 }).default("0"),
  milestone3Title: varchar("milestone_3_title", { length: 200 }),
  milestone3Description: text("milestone_3_description"),
  milestone3Amount: decimal("milestone_3_amount", { precision: 18, scale: 8 }).default("0"),
  milestone4Title: varchar("milestone_4_title", { length: 200 }),
  milestone4Description: text("milestone_4_description"),
  milestone4Amount: decimal("milestone_4_amount", { precision: 18, scale: 8 }).default("0"),
  daoCut: decimal("dao_cut", { precision: 18, scale: 8 }).default("0").notNull(),
  status: mysqlEnum("status", [...PROJECT_STATUSES]).default("open").notNull(),
  freelancerId: bigint("freelancer_id", { mode: "number", unsigned: true }).references(() => users.id),
  onChainId: int("on_chain_id"),
  escrowTxId: varchar("escrow_tx_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const proposals = mysqlTable("proposals", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number", unsigned: true })
    .references(() => projects.id)
    .notNull(),
  freelancerId: bigint("freelancer_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  coverLetter: text("cover_letter").notNull(),
  status: mysqlEnum("status", [...PROPOSAL_STATUSES]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const milestoneSubmissions = mysqlTable("milestone_submissions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number", unsigned: true })
    .references(() => projects.id)
    .notNull(),
  milestoneNum: int("milestone_num").notNull(),
  freelancerId: bigint("freelancer_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  deliverableUrl: varchar("deliverable_url", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", [...MILESTONE_SUBMISSION_STATUSES]).default("submitted").notNull(),
  completionTxId: varchar("completion_tx_id", { length: 100 }),
  releaseTxId: varchar("release_tx_id", { length: 100 }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const disputes = mysqlTable("disputes", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number", unsigned: true })
    .references(() => projects.id)
    .notNull(),
  milestoneNum: int("milestone_num").notNull(),
  filedBy: bigint("filed_by", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  reason: text("reason").notNull(),
  evidenceUrl: varchar("evidence_url", { length: 500 }),
  status: mysqlEnum("status", [...DISPUTE_STATUSES]).default("open").notNull(),
  resolution: text("resolution"),
  resolvedBy: bigint("resolved_by", { mode: "number", unsigned: true }).references(() => admins.id),
  disputeTxId: varchar("dispute_tx_id", { length: 100 }),
  resolutionTxId: varchar("resolution_tx_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const reviews = mysqlTable("reviews", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  projectId: bigint("project_id", { mode: "number", unsigned: true })
    .references(() => projects.id)
    .notNull(),
  reviewerId: bigint("reviewer_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  revieweeId: bigint("reviewee_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  subcategories: json("subcategories").$type<string[]>().notNull(),
});

export const NOTIFICATION_TYPES = [
  "milestone_submitted",
  "milestone_approved",
  "milestone_rejected",
  "dispute_filed",
  "dispute_resolved",
  "proposal_received",
  "proposal_accepted",
  "project_completed",
  "review_received",
] as const;

export const notifications = mysqlTable("notifications", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  type: mysqlEnum("type", [...NOTIFICATION_TYPES]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  projectId: bigint("project_id", { mode: "number", unsigned: true }).references(() => projects.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reputationNfts = mysqlTable("reputation_nfts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  recipientId: bigint("recipient_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  nftType: mysqlEnum("nft_type", [...NFT_TYPES]).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  metadataUrl: varchar("metadata_url", { length: 500 }),
  mintTxId: varchar("mint_tx_id", { length: 100 }),
  minted: boolean("minted").default(false).notNull(),
  issuedBy: bigint("issued_by", { mode: "number", unsigned: true })
    .references(() => admins.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSettings = mysqlTable("user_settings", {
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .primaryKey(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  messagingOption: mysqlEnum("messaging_option", [...MESSAGE_VISIBILITIES]).default("everyone").notNull(),
  profileVisibility: mysqlEnum("profile_visibility", [...PROFILE_VISIBILITIES]).default("public").notNull(),
  email: varchar("email", { length: 255 }),
  twitterHandle: varchar("twitter_handle", { length: 100 }),
  isTwitterConnected: boolean("is_twitter_connected").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationParticipants = mysqlTable("conversation_participants", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  conversationId: bigint("conversation_id", { mode: "number", unsigned: true })
    .references(() => conversations.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  lastReadAt: timestamp("last_read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  conversationId: bigint("conversation_id", { mode: "number", unsigned: true })
    .references(() => conversations.id)
    .notNull(),
  senderId: bigint("sender_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const socialPosts = mysqlTable("social_posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postLikes = mysqlTable("post_likes", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("post_id", { mode: "number", unsigned: true })
    .references(() => socialPosts.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postComments = mysqlTable("post_comments", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("post_id", { mode: "number", unsigned: true })
    .references(() => socialPosts.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userConnections = mysqlTable("user_connections", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  requesterId: bigint("requester_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  addresseeId: bigint("addressee_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  status: mysqlEnum("status", [...CONNECTION_STATUSES]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bounties = mysqlTable("bounties", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  createdById: bigint("created_by_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  links: varchar("links", { length: 500 }),
  reward: varchar("reward", { length: 100 }).notNull(),
  status: mysqlEnum("status", [...BOUNTY_STATUSES]).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bountySubmissions = mysqlTable("bounty_submissions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  bountyId: bigint("bounty_id", { mode: "number", unsigned: true })
    .references(() => bounties.id)
    .notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true })
    .references(() => users.id)
    .notNull(),
  description: text("description").notNull(),
  links: varchar("links", { length: 500 }),
  status: mysqlEnum("status", [...BOUNTY_SUBMISSION_STATUSES]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const platformSettings = mysqlTable("platform_settings", {
  id: int("id").primaryKey(),
  daoFeePercentage: decimal("dao_fee_percentage", { precision: 5, scale: 2 }).default("10.00").notNull(),
  daoWalletAddress: varchar("dao_wallet_address", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod Schemas

export const insertUserSchema = createInsertSchema(users, {
  stxAddress: z.string().min(1).max(255),
  username: z.string().max(100).optional(),
  role: z.enum([...USER_ROLES]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectUserSchema = createSelectSchema(users);

export const insertAdminSchema = createInsertSchema(admins, {
  username: z.string().min(3).max(100),
  passwordHash: z.string().min(1),
}).omit({ id: true, createdAt: true });

export const selectAdminSchema = createSelectSchema(admins);

export const insertProjectSchema = createInsertSchema(projects, {
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  tokenType: z.enum(["STX", "sBTC", "USDCx"]),
  numMilestones: z.number().int().min(1).max(4),
  milestone1Title: z.string().min(1).max(200),
  milestone1Amount: z.string(),
  milestone2Title: z.string().max(200).optional(),
  milestone2Amount: z.string().optional(),
  milestone3Title: z.string().max(200).optional(),
  milestone3Amount: z.string().optional(),
  milestone4Title: z.string().max(200).optional(),
  milestone4Amount: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, daoCut: true, status: true, freelancerId: true, onChainId: true, escrowTxId: true });

export const selectProjectSchema = createSelectSchema(projects);

export const insertProposalSchema = createInsertSchema(proposals, {
  coverLetter: z.string().min(1),
}).omit({ id: true, createdAt: true, updatedAt: true, status: true });

export const selectProposalSchema = createSelectSchema(proposals);

export const insertMilestoneSubmissionSchema = createInsertSchema(milestoneSubmissions, {
  milestoneNum: z.number().int().min(1).max(4),
  deliverableUrl: z.string().url().max(500),
  description: z.string().optional(),
  completionTxId: z.string().max(100).optional(),
}).omit({ id: true, submittedAt: true, reviewedAt: true, status: true, releaseTxId: true });

export const selectMilestoneSubmissionSchema = createSelectSchema(milestoneSubmissions);

export const insertDisputeSchema = createInsertSchema(disputes, {
  milestoneNum: z.number().int().min(1).max(4),
  reason: z.string().min(1),
  evidenceUrl: z.string().url().max(500).optional(),
  disputeTxId: z.string().max(100).optional(),
}).omit({ id: true, createdAt: true, resolvedAt: true, status: true, resolution: true, resolvedBy: true, resolutionTxId: true });

export const selectDisputeSchema = createSelectSchema(disputes);

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const selectReviewSchema = createSelectSchema(reviews);

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(100),
  icon: z.string().min(1).max(50),
  subcategories: z.array(z.string()),
}).omit({ id: true });

export const selectCategorySchema = createSelectSchema(categories);

export const insertReputationNftSchema = createInsertSchema(reputationNfts, {
  nftType: z.enum([...NFT_TYPES]),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  metadataUrl: z.string().url().max(500).optional(),
}).omit({ id: true, createdAt: true, minted: true, mintTxId: true });

export const selectReputationNftSchema = createSelectSchema(reputationNfts);

export const insertNotificationSchema = createInsertSchema(notifications, {
  type: z.enum([...NOTIFICATION_TYPES]),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
}).omit({ id: true, createdAt: true, isRead: true });

export const selectNotificationSchema = createSelectSchema(notifications);

export const insertPostCommentSchema = createInsertSchema(postComments, {
  content: z.string().trim().min(1).max(2000),
}).omit({ id: true, createdAt: true });

export const selectPostCommentSchema = createSelectSchema(postComments);

// TypeScript Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type MilestoneSubmission = typeof milestoneSubmissions.$inferSelect;
export type InsertMilestoneSubmission = z.infer<typeof insertMilestoneSubmissionSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type ReputationNft = typeof reputationNfts.$inferSelect;
export type InsertReputationNft = z.infer<typeof insertReputationNftSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserSetting = typeof userSettings.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type PostLike = typeof postLikes.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type UserConnection = typeof userConnections.$inferSelect;
export type Bounty = typeof bounties.$inferSelect;
export type BountySubmission = typeof bountySubmissions.$inferSelect;
export type PlatformSetting = typeof platformSettings.$inferSelect;
