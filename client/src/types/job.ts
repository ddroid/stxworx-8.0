export interface ApiCategory {
  id: number;
  name: string;
  icon: string;
  subcategories: string[];
}

export interface ApiRefundRecord {
  id: number;
  projectId: number;
  status: 'requested' | 'approved' | 'refunded' | 'cancelled';
  requestedBy: number;
  approvedBy?: number | null;
  adminActorId?: number | null;
  reason?: string | null;
  note?: string | null;
  txId?: string | null;
  refundedAmount?: string | null;
  remainingAmount?: string | null;
  requestedAt?: string;
  approvedAt?: string | null;
  executedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiRefundSummary {
  current: ApiRefundRecord | null;
  history: ApiRefundRecord[];
  remainingAmount: string;
  refundedAmount: string;
  status: 'none' | 'requested' | 'approved' | 'refunded' | 'cancelled';
  eligibleForClientRequest: boolean;
  eligibleForFreelancerApproval: boolean;
  eligibleForAdminRefund: boolean;
  configuredAdminPrincipal?: string | null;
}

export interface ApiProject {
  id: number;
  clientId: number;
  clientAddress?: string;
  freelancerId?: number | null;
  freelancerAddress?: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  tokenType: 'STX' | 'sBTC' | 'USDCx';
  numMilestones?: number;
  milestone1Title?: string | null;
  milestone1Description?: string | null;
  milestone1Amount?: string | number | null;
  milestone2Title?: string | null;
  milestone2Description?: string | null;
  milestone2Amount?: string | number | null;
  milestone3Title?: string | null;
  milestone3Description?: string | null;
  milestone3Amount?: string | number | null;
  milestone4Title?: string | null;
  milestone4Description?: string | null;
  milestone4Amount?: string | number | null;
  daoCut?: string | number | null;
  onChainId?: number | null;
  escrowTxId?: string | null;
  status: string;
  budget?: string | number;
  refundSummary?: ApiRefundSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppJobMilestone {
  title: string;
  description: string;
  percentage: number;
  amount: number;
}

export interface AppJob {
  id: number;
  title: string;
  category: string;
  subCategory: string;
  description: string;
  fullDescription: string;
  tags: string[];
  budget: string;
  rawBudget: number;
  currency: string;
  color: string;
  status: string;
  clientAddress?: string;
  freelancerAddress?: string;
  milestones: AppJobMilestone[];
}
