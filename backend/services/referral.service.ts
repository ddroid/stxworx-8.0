import { randomBytes } from "node:crypto";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, referralAttributions, referralCodes, referralPayouts, users, type Project } from "@shared/schema";
import { currencyService } from "./currency.service";
import { projectService } from "./project.service";

type ReferralLeaderboardEntry = {
  id: number;
  stxAddress: string;
  name: string | null;
  username: string | null;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalPayoutUsd: number;
  createdAt: Date;
  rank: number;
};

const REFERRAL_STORAGE_KEY = "stxworx_pending_referral_code";
const REFERRAL_FIRST_JOB_MIN_USD = Number(process.env.REFERRAL_FIRST_JOB_MIN_USD || "5");
const REFERRAL_TOTAL_SPEND_MIN_USD = Number(process.env.REFERRAL_TOTAL_SPEND_MIN_USD || "10");
const REFERRAL_PAYOUT_RATE = Number(process.env.REFERRAL_PAYOUT_RATE || "10");

function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function toUsdString(value: number) {
  return roundUsd(value).toFixed(2);
}

async function getProjectById(projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return project || null;
}

async function getPrimaryReferralCodeByOwner(ownerId: number) {
  const [code] = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.ownerId, ownerId), eq(referralCodes.isActive, true)))
    .orderBy(desc(referralCodes.createdAt))
    .limit(1);

  return code || null;
}

async function getAttributionByReferredUserId(referredUserId: number) {
  const [attribution] = await db
    .select()
    .from(referralAttributions)
    .where(eq(referralAttributions.referredUserId, referredUserId))
    .orderBy(desc(referralAttributions.createdAt))
    .limit(1);

  return attribution || null;
}

async function getEligibleAttributionByClientId(clientId: number) {
  const attribution = await getAttributionByReferredUserId(clientId);
  if (!attribution || attribution.status === "blocked") {
    return null;
  }

  return attribution;
}

async function createUniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = randomBytes(5).toString("hex").toUpperCase();
    const [existing] = await db.select({ id: referralCodes.id }).from(referralCodes).where(eq(referralCodes.code, candidate)).limit(1);
    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate referral code");
}

async function computeProjectSpendUsd(project: Project) {
  const budget = Number(projectService.computeBudget(project));
  return roundUsd(await currencyService.getUsdValue(budget, project.tokenType));
}

export const referralService = {
  storageKey: REFERRAL_STORAGE_KEY,

  normalizeReferralCode,

  async getOrCreateReferralCode(ownerId: number) {
    const existing = await getPrimaryReferralCodeByOwner(ownerId);
    if (existing) {
      return existing;
    }

    const code = await createUniqueCode();
    const [result] = await db.insert(referralCodes).values({ ownerId, code });
    const [created] = await db.select().from(referralCodes).where(eq(referralCodes.id, result.insertId));
    return created!;
  },

  async markReferralCodeShared(ownerId: number) {
    const code = await this.getOrCreateReferralCode(ownerId);
    await db
      .update(referralCodes)
      .set({
        lastSharedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(referralCodes.id, code.id));

    const [updated] = await db.select().from(referralCodes).where(eq(referralCodes.id, code.id));
    return updated!;
  },

  async attributeClientReferral(input: {
    referralCode?: string | null;
    userId: number;
    userRole: "client" | "freelancer";
    stxAddress: string;
    isNewUser: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const normalizedCode = normalizeReferralCode(input.referralCode || "");
    if (!normalizedCode || input.userRole !== "client" || !input.isNewUser) {
      return null;
    }

    const [code] = await db
      .select()
      .from(referralCodes)
      .where(and(eq(referralCodes.code, normalizedCode), eq(referralCodes.isActive, true)))
      .limit(1);

    if (!code || code.ownerId === input.userId) {
      return null;
    }

    const [referrer] = await db
      .select({ id: users.id, stxAddress: users.stxAddress, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, code.ownerId))
      .limit(1);

    if (!referrer || !referrer.isActive || referrer.stxAddress === input.stxAddress) {
      return null;
    }

    const existing = await getAttributionByReferredUserId(input.userId);
    if (existing) {
      return existing;
    }

    const [result] = await db.insert(referralAttributions).values({
      referralCodeId: code.id,
      referrerId: code.ownerId,
      referredUserId: input.userId,
      status: "pending",
      firstSeenIp: input.ipAddress || null,
      attributionIp: input.ipAddress || null,
      userAgent: input.userAgent || null,
      becameClientAt: new Date(),
    });

    const [created] = await db.select().from(referralAttributions).where(eq(referralAttributions.id, result.insertId));
    return created || null;
  },

  async recordProjectCreated(projectId: number) {
    const project = await getProjectById(projectId);
    if (!project) {
      return null;
    }

    const attribution = await getEligibleAttributionByClientId(project.clientId);
    if (!attribution || attribution.firstProjectId) {
      return attribution;
    }

    await db
      .update(referralAttributions)
      .set({
        firstProjectId: project.id,
        updatedAt: new Date(),
      })
      .where(eq(referralAttributions.id, attribution.id));

    const [updated] = await db.select().from(referralAttributions).where(eq(referralAttributions.id, attribution.id));
    return updated || null;
  },

  async recordProjectEscrowFunded(projectId: number) {
    const project = await getProjectById(projectId);
    if (!project) {
      return null;
    }

    const attribution = await getEligibleAttributionByClientId(project.clientId);
    if (!attribution || attribution.firstEscrowProjectId) {
      return attribution;
    }

    await db
      .update(referralAttributions)
      .set({
        firstEscrowProjectId: project.id,
        updatedAt: new Date(),
      })
      .where(eq(referralAttributions.id, attribution.id));

    const [updated] = await db.select().from(referralAttributions).where(eq(referralAttributions.id, attribution.id));
    return updated || null;
  },

  async recordProjectCompleted(projectId: number) {
    const project = await getProjectById(projectId);
    if (!project) {
      return null;
    }

    const attribution = await getAttributionByReferredUserId(project.clientId);
    if (!attribution || attribution.status === "blocked") {
      return attribution;
    }

    if (project.freelancerId && project.freelancerId === attribution.referrerId) {
      await db
        .update(referralAttributions)
        .set({
          status: "blocked",
          blockedReason: "Referrer cannot be the paid freelancer on the qualifying project",
          firstCompletedProjectId: attribution.firstCompletedProjectId || project.id,
          updatedAt: new Date(),
        })
        .where(eq(referralAttributions.id, attribution.id));

      const [blocked] = await db.select().from(referralAttributions).where(eq(referralAttributions.id, attribution.id));
      return blocked || null;
    }

    const projectSpendUsd = await computeProjectSpendUsd(project);
    const previousCompletedJobs = attribution.totalCompletedJobs || 0;
    const cumulativeCompletedSpendUsd = roundUsd(Number(attribution.cumulativeCompletedSpendUsd || 0) + projectSpendUsd);
    const nextCompletedJobs = previousCompletedJobs + 1;
    const qualifiesOnFirstCompletedJob = previousCompletedJobs === 0 && projectSpendUsd >= REFERRAL_FIRST_JOB_MIN_USD;
    const qualifiesOnTotalSpend = cumulativeCompletedSpendUsd >= REFERRAL_TOTAL_SPEND_MIN_USD;
    const shouldQualify = attribution.status !== "qualified" && (qualifiesOnFirstCompletedJob || qualifiesOnTotalSpend);
    const qualificationRule = qualifiesOnFirstCompletedJob
      ? "first_completed_job_minimum"
      : qualifiesOnTotalSpend
        ? "cumulative_spend_minimum"
        : attribution.qualificationRule;

    await db
      .update(referralAttributions)
      .set({
        totalCompletedJobs: nextCompletedJobs,
        cumulativeCompletedSpendUsd: toUsdString(cumulativeCompletedSpendUsd),
        firstCompletedSpendUsd: attribution.firstCompletedSpendUsd || toUsdString(projectSpendUsd),
        firstCompletedProjectId: attribution.firstCompletedProjectId || project.id,
        qualifiedProjectId: shouldQualify ? project.id : attribution.qualifiedProjectId,
        qualificationRule: qualificationRule || null,
        status: shouldQualify ? "qualified" : attribution.status,
        qualifiedAt: shouldQualify ? new Date() : attribution.qualifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(referralAttributions.id, attribution.id));

    const [updated] = await db.select().from(referralAttributions).where(eq(referralAttributions.id, attribution.id));
    if (!updated || !shouldQualify) {
      return updated || null;
    }

    const [existingPayout] = await db
      .select({ id: referralPayouts.id })
      .from(referralPayouts)
      .where(eq(referralPayouts.attributionId, updated.id))
      .limit(1);

    if (!existingPayout) {
      const eligibleSpendUsd = qualifiesOnFirstCompletedJob ? projectSpendUsd : cumulativeCompletedSpendUsd;
      const payoutAmountUsd = roundUsd((eligibleSpendUsd * REFERRAL_PAYOUT_RATE) / 100);

      await db.insert(referralPayouts).values({
        attributionId: updated.id,
        referrerId: updated.referrerId,
        referredUserId: updated.referredUserId,
        projectId: project.id,
        status: "pending",
        amountUsd: toUsdString(payoutAmountUsd),
        eligibleSpendUsd: toUsdString(eligibleSpendUsd),
        payoutRate: toUsdString(REFERRAL_PAYOUT_RATE),
        payoutCurrency: "USD",
      });
    }

    return updated;
  },

  async getLeaderboard(limit = 10): Promise<ReferralLeaderboardEntry[]> {
    const rows = await db
      .select({
        id: users.id,
        stxAddress: users.stxAddress,
        name: users.name,
        username: users.username,
        createdAt: users.createdAt,
        qualifiedReferrals: sql<number>`coalesce(sum(case when ${referralAttributions.status} = 'qualified' then 1 else 0 end), 0)`,
        pendingReferrals: sql<number>`coalesce(sum(case when ${referralAttributions.status} = 'pending' then 1 else 0 end), 0)`,
        totalPayoutUsd: sql<string>`coalesce(sum(case when ${referralPayouts.id} is not null then ${referralPayouts.amountUsd} else 0 end), 0)`,
      })
      .from(users)
      .leftJoin(referralAttributions, eq(referralAttributions.referrerId, users.id))
      .leftJoin(referralPayouts, eq(referralPayouts.attributionId, referralAttributions.id))
      .where(eq(users.isActive, true))
      .groupBy(users.id, users.stxAddress, users.name, users.username, users.createdAt)
      .having(
        sql`coalesce(sum(case when ${referralAttributions.status} = 'qualified' then 1 else 0 end), 0) + coalesce(sum(case when ${referralAttributions.status} = 'pending' then 1 else 0 end), 0) > 0`,
      )
      .orderBy(
        sql`coalesce(sum(case when ${referralAttributions.status} = 'qualified' then 1 else 0 end), 0) desc`,
        sql`coalesce(sum(case when ${referralAttributions.status} = 'pending' then 1 else 0 end), 0) desc`,
        sql`coalesce(sum(case when ${referralPayouts.id} is not null then ${referralPayouts.amountUsd} else 0 end), 0) desc`,
        users.createdAt,
      )
      .limit(limit);

    return rows.map((row, index) => ({
      id: row.id,
      stxAddress: row.stxAddress,
      name: row.name,
      username: row.username,
      qualifiedReferrals: Number(row.qualifiedReferrals) || 0,
      pendingReferrals: Number(row.pendingReferrals) || 0,
      totalPayoutUsd: roundUsd(Number(row.totalPayoutUsd) || 0),
      createdAt: row.createdAt,
      rank: index + 1,
    }));
  },

  async getProgramOverview(userId: number) {
    const code = await getPrimaryReferralCodeByOwner(userId);
    const attributions = await db
      .select()
      .from(referralAttributions)
      .where(eq(referralAttributions.referrerId, userId))
      .orderBy(desc(referralAttributions.createdAt));

    const payouts = await db
      .select()
      .from(referralPayouts)
      .where(eq(referralPayouts.referrerId, userId))
      .orderBy(desc(referralPayouts.createdAt));

    const referredUserIds = Array.from(new Set(attributions.map((entry) => entry.referredUserId)));
    const referredUsers = referredUserIds.length
      ? await db
          .select({
            id: users.id,
            stxAddress: users.stxAddress,
            name: users.name,
            username: users.username,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.id, referredUserIds))
      : [];

    const referredUsersById = new Map(referredUsers.map((entry) => [entry.id, entry]));

    const referrals = attributions.map((entry) => ({
      id: entry.id,
      status: entry.status,
      referredUser: referredUsersById.get(entry.referredUserId) || null,
      firstProjectId: entry.firstProjectId || null,
      firstEscrowProjectId: entry.firstEscrowProjectId || null,
      firstCompletedProjectId: entry.firstCompletedProjectId || null,
      qualifiedProjectId: entry.qualifiedProjectId || null,
      totalCompletedJobs: entry.totalCompletedJobs,
      cumulativeCompletedSpendUsd: String(entry.cumulativeCompletedSpendUsd || "0.00"),
      firstCompletedSpendUsd: entry.firstCompletedSpendUsd ? String(entry.firstCompletedSpendUsd) : null,
      qualificationRule: entry.qualificationRule || null,
      blockedReason: entry.blockedReason || null,
      firstSeenAt: entry.firstSeenAt,
      qualifiedAt: entry.qualifiedAt || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    const payoutRows = payouts.map((entry) => ({
      id: entry.id,
      attributionId: entry.attributionId,
      projectId: entry.projectId || null,
      status: entry.status,
      amountUsd: String(entry.amountUsd),
      eligibleSpendUsd: String(entry.eligibleSpendUsd),
      payoutRate: String(entry.payoutRate),
      payoutCurrency: entry.payoutCurrency,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      approvedAt: entry.approvedAt || null,
      paidAt: entry.paidAt || null,
      cancelledAt: entry.cancelledAt || null,
    }));

    return {
      code,
      summary: {
        totalReferrals: referrals.length,
        qualifiedReferrals: referrals.filter((entry) => entry.status === "qualified").length,
        pendingReferrals: referrals.filter((entry) => entry.status === "pending").length,
        blockedReferrals: referrals.filter((entry) => entry.status === "blocked").length,
        totalPayoutUsd: toUsdString(payoutRows.reduce((sum, entry) => sum + Number(entry.amountUsd || 0), 0)),
        pendingPayoutUsd: toUsdString(payoutRows.filter((entry) => entry.status === "pending").reduce((sum, entry) => sum + Number(entry.amountUsd || 0), 0)),
        paidPayoutUsd: toUsdString(payoutRows.filter((entry) => entry.status === "paid").reduce((sum, entry) => sum + Number(entry.amountUsd || 0), 0)),
      },
      referrals,
      payouts: payoutRows,
      policy: {
        firstJobMinimumUsd: REFERRAL_FIRST_JOB_MIN_USD,
        totalSpendMinimumUsd: REFERRAL_TOTAL_SPEND_MIN_USD,
        payoutRate: REFERRAL_PAYOUT_RATE,
      },
    };
  },

  async getPublicReferralCode(code: string) {
    const normalizedCode = normalizeReferralCode(code);
    if (!normalizedCode) {
      return null;
    }

    const [record] = await db
      .select()
      .from(referralCodes)
      .where(and(eq(referralCodes.code, normalizedCode), eq(referralCodes.isActive, true)))
      .limit(1);

    return record || null;
  },

  async getReferralCount(userId: number) {
    const [result] = await db
      .select({ total: count(referralAttributions.id) })
      .from(referralAttributions)
      .where(eq(referralAttributions.referrerId, userId));

    return result?.total || 0;
  },

  async getReferralsByUsername(username: string) {
    // First find the user by username (case-insensitive)
    const [referrer] = await db
      .select({
        id: users.id,
        stxAddress: users.stxAddress,
        name: users.name,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);

    if (!referrer) {
      return null;
    }

    // Get their referral code
    const code = await getPrimaryReferralCodeByOwner(referrer.id);

    // Get all attributions for this referrer
    const attributions = await db
      .select()
      .from(referralAttributions)
      .where(eq(referralAttributions.referrerId, referrer.id))
      .orderBy(desc(referralAttributions.createdAt));

    // Get all payouts for this referrer
    const payouts = await db
      .select()
      .from(referralPayouts)
      .where(eq(referralPayouts.referrerId, referrer.id))
      .orderBy(desc(referralPayouts.createdAt));

    // Get referred user details
    const referredUserIds = Array.from(new Set(attributions.map((a) => a.referredUserId)));
    const referredUsers = referredUserIds.length
      ? await db
          .select({
            id: users.id,
            stxAddress: users.stxAddress,
            name: users.name,
            username: users.username,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.id, referredUserIds))
      : [];

    const referredUsersById = new Map(referredUsers.map((u) => [u.id, u]));

    // Build complete referral records
    const referrals = attributions.map((attr) => {
      const referredUser = referredUsersById.get(attr.referredUserId);
      const relatedPayouts = payouts.filter((p) => p.attributionId === attr.id);

      return {
        id: attr.id,
        status: attr.status,
        referredUser: referredUser || null,
        firstProjectId: attr.firstProjectId || null,
        firstEscrowProjectId: attr.firstEscrowProjectId || null,
        firstCompletedProjectId: attr.firstCompletedProjectId || null,
        qualifiedProjectId: attr.qualifiedProjectId || null,
        totalCompletedJobs: attr.totalCompletedJobs,
        cumulativeCompletedSpendUsd: String(attr.cumulativeCompletedSpendUsd || "0.00"),
        firstCompletedSpendUsd: attr.firstCompletedSpendUsd ? String(attr.firstCompletedSpendUsd) : null,
        qualificationRule: attr.qualificationRule || null,
        blockedReason: attr.blockedReason || null,
        firstSeenAt: attr.firstSeenAt,
        attributedAt: attr.attributedAt,
        becameClientAt: attr.becameClientAt,
        qualifiedAt: attr.qualifiedAt || null,
        createdAt: attr.createdAt,
        updatedAt: attr.updatedAt,
        firstSeenIp: attr.firstSeenIp || null,
        attributionIp: attr.attributionIp || null,
        userAgent: attr.userAgent || null,
        payouts: relatedPayouts.map((p) => ({
          id: p.id,
          status: p.status,
          amountUsd: String(p.amountUsd),
          eligibleSpendUsd: String(p.eligibleSpendUsd),
          payoutRate: String(p.payoutRate),
          projectId: p.projectId,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
        })),
      };
    });

    // Calculate summary stats
    const summary = {
      totalReferrals: referrals.length,
      qualifiedReferrals: referrals.filter((r) => r.status === "qualified").length,
      pendingReferrals: referrals.filter((r) => r.status === "pending").length,
      blockedReferrals: referrals.filter((r) => r.status === "blocked").length,
      totalPayoutUsd: toUsdString(
        payouts.reduce((sum, p) => sum + Number(p.amountUsd || 0), 0)
      ),
      pendingPayoutUsd: toUsdString(
        payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amountUsd || 0), 0)
      ),
      paidPayoutUsd: toUsdString(
        payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amountUsd || 0), 0)
      ),
    };

    return {
      referrer: {
        id: referrer.id,
        stxAddress: referrer.stxAddress,
        name: referrer.name,
        username: referrer.username,
        role: referrer.role,
        isActive: referrer.isActive,
      },
      code: code
        ? {
            id: code.id,
            code: code.code,
            isActive: code.isActive,
            lastSharedAt: code.lastSharedAt,
            createdAt: code.createdAt,
          }
        : null,
      referrals,
      summary,
    };
  },
};
