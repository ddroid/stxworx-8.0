import { db } from "../db";
import { milestoneSubmissions, projects, refunds, users } from "@shared/schema";
import type { Project, Refund } from "@shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { notificationService } from "./notification.service";
import { stacksTransactionService } from "./stacks-transaction.service";

type ProjectActorAddresses = {
  clientAddress: string;
  freelancerAddress: string;
};

type RefundSummary = {
  current: Refund | null;
  history: Refund[];
  remainingAmount: string;
  refundedAmount: string;
  status: "none" | Refund["status"];
  eligibleForClientRequest: boolean;
  eligibleForFreelancerApproval: boolean;
  eligibleForAdminRefund: boolean;
  configuredAdminPrincipal: string | null;
};

function parseAmount(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatAmount(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  return normalized.toFixed(8).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1") || "0";
}

function getMilestoneAmount(project: Project, milestoneNum: number) {
  switch (milestoneNum) {
    case 1:
      return parseAmount(project.milestone1Amount);
    case 2:
      return parseAmount(project.milestone2Amount);
    case 3:
      return parseAmount(project.milestone3Amount);
    case 4:
      return parseAmount(project.milestone4Amount);
    default:
      return 0;
  }
}

function getConfiguredAdminPrincipal() {
  const value = (process.env.REFUND_ADMIN_PRINCIPAL || "").trim();
  return value || null;
}

async function getProjectById(projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return project || null;
}

async function getProjectSubmissions(projectId: number) {
  return db
    .select()
    .from(milestoneSubmissions)
    .where(eq(milestoneSubmissions.projectId, projectId));
}

async function getProjectActorAddresses(project: Project): Promise<ProjectActorAddresses> {
  const actorIds = [project.clientId, project.freelancerId].filter((value): value is number => typeof value === "number");
  const rows = actorIds.length === 0
    ? []
    : await db
        .select({ id: users.id, stxAddress: users.stxAddress })
        .from(users)
        .where(inArray(users.id, actorIds));

  const addressMap = Object.fromEntries(rows.map((row) => [row.id, row.stxAddress]));

  return {
    clientAddress: addressMap[project.clientId] || "",
    freelancerAddress: project.freelancerId ? addressMap[project.freelancerId] || "" : "",
  };
}

async function getRefundHistory(projectId: number) {
  return db
    .select()
    .from(refunds)
    .where(eq(refunds.projectId, projectId))
    .orderBy(desc(refunds.createdAt), desc(refunds.id));
}

async function computeRemainingAmount(project: Project) {
  const totalAmount = [1, 2, 3, 4].reduce((sum, milestoneNum) => sum + getMilestoneAmount(project, milestoneNum), 0);
  if (project.status === "refunded") {
    return {
      totalAmount,
      releasedAmount: totalAmount,
      remainingAmount: 0,
    };
  }

  const submissions = await getProjectSubmissions(project.id);
  const releasedAmount = submissions
    .filter((submission) => submission.status === "approved")
    .reduce((sum, submission) => sum + getMilestoneAmount(project, submission.milestoneNum), 0);
  const remainingAmount = Math.max(0, totalAmount - releasedAmount);

  return {
    totalAmount,
    releasedAmount,
    remainingAmount,
  };
}

async function updateProjectRefunded(projectId: number) {
  await db
    .update(projects)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

async function updateRefundRecord(refundId: number, data: Partial<Refund>) {
  await db
    .update(refunds)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(refunds.id, refundId));

  const [record] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!record) {
    throw new Error("Refund record not found after update");
  }

  return record;
}

async function notifyRefundRequested(project: Project) {
  if (!project.freelancerId) {
    return;
  }

  await notificationService.create({
    userId: project.freelancerId,
    type: "refund_requested",
    title: `Refund Requested for ${project.title}`,
    message: `The client has requested a refund for the remaining escrow on \"${project.title}\". Review the request in your active contracts.`,
    projectId: project.id,
  });
}

async function notifyRefundApproved(project: Project) {
  await notificationService.create({
    userId: project.clientId,
    type: "refund_approved",
    title: `Refund Approval Submitted for ${project.title}`,
    message: `The refund approval transaction for \"${project.title}\" has been submitted and is awaiting chain confirmation.`,
    projectId: project.id,
  });
}

async function notifyRefundExecuted(project: Project) {
  const recipients = [project.clientId, project.freelancerId].filter((value): value is number => typeof value === "number");

  await Promise.all(
    recipients.map((userId) =>
      notificationService.create({
        userId,
        type: "refund_refunded",
        title: `Escrow Refunded for ${project.title}`,
        message: `The remaining escrow for \"${project.title}\" has been refunded to the client wallet.`,
        projectId: project.id,
      }),
    ),
  );
}

async function syncApprovedRefundRecord(project: Project, refundRecord: Refund) {
  if (refundRecord.status !== "approved" || !refundRecord.txId) {
    return refundRecord;
  }

  const actors = await getProjectActorAddresses(project);
  const expectedSenderAddress = refundRecord.adminActorId ? getConfiguredAdminPrincipal() : actors.freelancerAddress;
  if (!expectedSenderAddress) {
    return refundRecord;
  }

  const verification = await stacksTransactionService.verifyRefundTx({
    txId: refundRecord.txId,
    tokenType: project.tokenType,
    expectedSenderAddress,
    expectedOnChainId: project.onChainId,
    refundKind: refundRecord.adminActorId ? "admin" : "mutual",
  });

  if (verification.status !== "confirmed") {
    return refundRecord;
  }

  const { remainingAmount } = await computeRemainingAmount(project);
  const updated = await updateRefundRecord(refundRecord.id, {
    status: "refunded",
    executedAt: new Date(),
    refundedAmount: formatAmount(remainingAmount),
    remainingAmount: "0",
  });

  await updateProjectRefunded(project.id);
  await notifyRefundExecuted(project);

  return updated;
}

async function buildRefundSummary(project: Project): Promise<RefundSummary> {
  const history = await getRefundHistory(project.id);
  const current = history[0] ? await syncApprovedRefundRecord(project, history[0]) : null;
  const fullHistory = current && history[0] && current.id === history[0].id ? [current, ...history.slice(1)] : history;
  const { remainingAmount } = await computeRemainingAmount(project);
  const effectiveCurrent = fullHistory[0] || null;
  const configuredAdminPrincipal = getConfiguredAdminPrincipal();
  const status = effectiveCurrent?.status || "none";

  return {
    current: effectiveCurrent,
    history: fullHistory,
    remainingAmount: formatAmount(remainingAmount),
    refundedAmount: effectiveCurrent?.refundedAmount ? String(effectiveCurrent.refundedAmount) : "0",
    status,
    eligibleForClientRequest: project.status === "active" && remainingAmount > 0 && (!effectiveCurrent || effectiveCurrent.status === "cancelled"),
    eligibleForFreelancerApproval: project.status === "active" && remainingAmount > 0 && effectiveCurrent?.status === "requested",
    eligibleForAdminRefund: project.status === "active" && remainingAmount > 0 && status !== "refunded",
    configuredAdminPrincipal,
  };
}

export const refundService = {
  async attachRefundSummary<T extends Project>(projectRows: T[]) {
    return Promise.all(
      projectRows.map(async (project) => ({
        ...project,
        refundSummary: await buildRefundSummary(project),
      })),
    );
  },

  async getProjectRefundStatus(projectId: number) {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    return buildRefundSummary(project);
  },

  async requestRefund(projectId: number, requesterId: number, data: { reason?: string | null }) {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.clientId !== requesterId) {
      throw new Error("Only the client can request a refund");
    }
    if (project.status !== "active") {
      throw new Error("Refunds are only available for active escrow projects");
    }

    const summary = await buildRefundSummary(project);
    if (!summary.eligibleForClientRequest) {
      throw new Error(summary.status === "refunded" ? "Project has already been refunded" : "Refund request is not available for this project");
    }

    await db.insert(refunds).values({
      projectId,
      requestedBy: requesterId,
      reason: data.reason?.trim() || null,
      remainingAmount: summary.remainingAmount,
    });

    await notifyRefundRequested(project);
    return this.getProjectRefundStatus(projectId);
  },

  async cancelRefundRequest(projectId: number, requesterId: number) {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.clientId !== requesterId) {
      throw new Error("Only the client can cancel a refund request");
    }

    const history = await getRefundHistory(projectId);
    const current = history[0];
    if (!current || current.status !== "requested") {
      throw new Error("There is no pending refund request to cancel");
    }
    if (current.requestedBy !== requesterId) {
      throw new Error("Only the original requester can cancel this refund request");
    }

    await updateRefundRecord(current.id, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    return this.getProjectRefundStatus(projectId);
  },

  async approveRefund(projectId: number, approverId: number, data: { txId: string; note?: string | null }) {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (project.freelancerId !== approverId) {
      throw new Error("Only the freelancer can approve a mutual refund");
    }
    if (!project.onChainId) {
      throw new Error("Project is missing its on-chain escrow id");
    }

    const history = await getRefundHistory(projectId);
    const current = history[0];
    if (!current || current.status !== "requested") {
      throw new Error("There is no pending refund request to approve");
    }

    const actors = await getProjectActorAddresses(project);
    const verification = await stacksTransactionService.verifyRefundTx({
      txId: data.txId,
      tokenType: project.tokenType,
      expectedSenderAddress: actors.freelancerAddress,
      expectedOnChainId: project.onChainId,
      refundKind: "mutual",
    });

    if (verification.status === "failed") {
      throw new Error(verification.error || "Refund approval transaction could not be verified");
    }

    const { remainingAmount } = await computeRemainingAmount(project);
    const nextStatus = verification.status === "confirmed" ? "refunded" : "approved";

    await updateRefundRecord(current.id, {
      status: nextStatus,
      approvedBy: approverId,
      note: data.note?.trim() || current.note || null,
      txId: data.txId,
      approvedAt: new Date(),
      executedAt: verification.status === "confirmed" ? new Date() : current.executedAt,
      refundedAmount: verification.status === "confirmed" ? formatAmount(remainingAmount) : current.refundedAmount,
      remainingAmount: verification.status === "confirmed" ? "0" : formatAmount(remainingAmount),
    });

    if (verification.status === "confirmed") {
      await updateProjectRefunded(projectId);
      await notifyRefundExecuted(project);
    } else {
      await notifyRefundApproved(project);
    }

    return this.getProjectRefundStatus(projectId);
  },

  async adminRefund(projectId: number, adminId: number, data: { txId: string; note?: string | null }) {
    const project = await getProjectById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!project.onChainId) {
      throw new Error("Project is missing its on-chain escrow id");
    }

    const adminPrincipal = getConfiguredAdminPrincipal();
    if (!adminPrincipal) {
      throw new Error("REFUND_ADMIN_PRINCIPAL must be configured before admin refunds can be verified");
    }

    const summary = await buildRefundSummary(project);
    if (!summary.eligibleForAdminRefund) {
      throw new Error("Admin refund is not available for this project");
    }

    const verification = await stacksTransactionService.verifyRefundTx({
      txId: data.txId,
      tokenType: project.tokenType,
      expectedSenderAddress: adminPrincipal,
      expectedOnChainId: project.onChainId,
      refundKind: "admin",
    });

    if (verification.status === "failed") {
      throw new Error(verification.error || "Admin refund transaction could not be verified");
    }

    const history = await getRefundHistory(projectId);
    const current = history[0];
    const { remainingAmount } = await computeRemainingAmount(project);
    const nextStatus = verification.status === "confirmed" ? "refunded" : "approved";
    const basePayload = {
      status: nextStatus as Refund["status"],
      adminActorId: adminId,
      note: data.note?.trim() || current?.note || null,
      txId: data.txId,
      approvedAt: new Date(),
      executedAt: verification.status === "confirmed" ? new Date() : null,
      refundedAmount: verification.status === "confirmed" ? formatAmount(remainingAmount) : current?.refundedAmount || null,
      remainingAmount: verification.status === "confirmed" ? "0" : formatAmount(remainingAmount),
    };

    if (current && current.status !== "refunded") {
      await updateRefundRecord(current.id, basePayload);
    } else {
      await db.insert(refunds).values({
        projectId,
        requestedBy: project.clientId,
        reason: null,
        ...basePayload,
      });
    }

    if (verification.status === "confirmed") {
      await updateProjectRefunded(projectId);
      await notifyRefundExecuted(project);
    } else {
      await notifyRefundApproved(project);
    }

    return this.getProjectRefundStatus(projectId);
  },

  async listAdminRefundQueue() {
    const rows = await db
      .select()
      .from(refunds)
      .where(and(eq(refunds.status, "requested")));

    const projectRows = rows.length === 0
      ? []
      : await db
          .select()
          .from(projects)
          .where(inArray(projects.id, rows.map((row) => row.projectId)));

    const projectMap = new Map(projectRows.map((project) => [project.id, project]));

    return Promise.all(
      rows.map(async (row) => {
        const project = projectMap.get(row.projectId);
        return {
          ...row,
          project,
          refundSummary: project ? await buildRefundSummary(project) : null,
          configuredAdminPrincipal: getConfiguredAdminPrincipal(),
        };
      }),
    );
  },
};
