import { db } from "../db";
import { ACCEPTANCE_PAYMENT_STATUSES, proposalAcceptanceProgress } from "@shared/schema";
import { eq } from "drizzle-orm";
import { calculateProposalAcceptanceAmounts } from "../../shared/proposal-acceptance";

type AcceptanceProgressRecord = typeof proposalAcceptanceProgress.$inferSelect;
type AcceptancePaymentStatus = typeof ACCEPTANCE_PAYMENT_STATUSES[number];

async function getByProposalId(proposalId: number) {
  const [progress] = await db
    .select()
    .from(proposalAcceptanceProgress)
    .where(eq(proposalAcceptanceProgress.proposalId, proposalId));

  return progress || null;
}

export const proposalAcceptanceService = {
  getByProposalId,

  async ensureForProposal(input: {
    proposalId: number;
    projectId: number;
    clientId: number;
    proposedAmount: string;
    feePercentage: string;
  }) {
    const existing = await getByProposalId(input.proposalId);
    if (existing) {
      return existing;
    }

    const amounts = calculateProposalAcceptanceAmounts(input.proposedAmount, input.feePercentage);
    const insertResult = await db.insert(proposalAcceptanceProgress).values({
      proposalId: input.proposalId,
      projectId: input.projectId,
      clientId: input.clientId,
      compensationAmount: amounts.compensationAmount,
      platformFeeAmount: amounts.platformFeeAmount,
    });

    const [created] = await db
      .select()
      .from(proposalAcceptanceProgress)
      .where(eq(proposalAcceptanceProgress.id, insertResult[0].insertId));

    if (!created) {
      throw new Error("Failed to create proposal acceptance progress");
    }

    return created;
  },

  async updateCompensation(
    proposalId: number,
    data: {
      txId?: string | null;
      onChainId?: number | null;
      status: AcceptancePaymentStatus;
      error?: string | null;
      verifiedAt?: Date | null;
      lastCheckedAt?: Date | null;
    },
  ) {
    await db
      .update(proposalAcceptanceProgress)
      .set({
        compensationTxId: data.txId ?? null,
        compensationOnChainId: data.onChainId ?? null,
        compensationStatus: data.status,
        compensationError: data.error ?? null,
        compensationVerifiedAt: data.verifiedAt ?? null,
        compensationLastCheckedAt: data.lastCheckedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(proposalAcceptanceProgress.proposalId, proposalId));

    return getByProposalId(proposalId);
  },

  async updatePlatformFee(
    proposalId: number,
    data: {
      txId?: string | null;
      payer?: string | null;
      network?: string | null;
      status: AcceptancePaymentStatus;
      error?: string | null;
      verifiedAt?: Date | null;
      expiresAt?: Date | null;
    },
  ) {
    await db
      .update(proposalAcceptanceProgress)
      .set({
        platformFeeTxId: data.txId ?? null,
        platformFeePayer: data.payer ?? null,
        platformFeeNetwork: data.network ?? null,
        platformFeeStatus: data.status,
        platformFeeError: data.error ?? null,
        platformFeeVerifiedAt: data.verifiedAt ?? null,
        platformFeeExpiresAt: data.expiresAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(proposalAcceptanceProgress.proposalId, proposalId));

    return getByProposalId(proposalId);
  },

  async markFinalized(proposalId: number) {
    await db
      .update(proposalAcceptanceProgress)
      .set({
        finalizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(proposalAcceptanceProgress.proposalId, proposalId));

    return getByProposalId(proposalId);
  },

  serialize(progress: AcceptanceProgressRecord | null) {
    if (!progress) {
      return null;
    }

    return {
      proposalId: progress.proposalId,
      projectId: progress.projectId,
      clientId: progress.clientId,
      compensationAmount: progress.compensationAmount,
      platformFeeAmount: progress.platformFeeAmount,
      compensation: {
        status: progress.compensationStatus,
        txId: progress.compensationTxId,
        onChainId: progress.compensationOnChainId,
        verifiedAt: progress.compensationVerifiedAt?.toISOString() || null,
        lastCheckedAt: progress.compensationLastCheckedAt?.toISOString() || null,
        error: progress.compensationError,
      },
      platformFee: {
        status: progress.platformFeeStatus,
        txId: progress.platformFeeTxId,
        payer: progress.platformFeePayer,
        network: progress.platformFeeNetwork,
        verifiedAt: progress.platformFeeVerifiedAt?.toISOString() || null,
        expiresAt: progress.platformFeeExpiresAt?.toISOString() || null,
        error: progress.platformFeeError,
      },
      finalizedAt: progress.finalizedAt?.toISOString() || null,
      canFinalize: progress.compensationStatus === "confirmed" && progress.platformFeeStatus === "confirmed",
    };
  },
};
