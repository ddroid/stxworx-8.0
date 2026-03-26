import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import * as Shared from '../shared';
import {
  acceptProposal,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getMyPostedProjects,
  getProject,
  getProjectProposals,
  preflightAcceptProposalPayment,
  getUserProfile,
  getUserReviews,
  rejectProposal,
  toDisplayName,
  type ApiProposal,
} from '../lib/api';
import { createEscrowForProject } from '../lib/escrow';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview } from '../types/user';

type AcceptanceStep = 'compensation' | 'platformFee' | 'finalize';

type ProposalAcceptanceProgress = {
  compensation?: {
    amount: string;
    onChainId: number;
    txId: string;
  };
  platformFee?: {
    amount: string;
    txId: string;
  };
  error?: string | null;
};

const PLATFORM_FEE_PERCENTAGE = 10;

function toAtomicUnits(amount: string | number | null | undefined, tokenType: ApiProject['tokenType']) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  const multiplier = tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
  return Math.floor(numeric * multiplier);
}

function fromAtomicUnits(amount: number, tokenType: ApiProject['tokenType']) {
  const decimals = tokenType === 'sBTC' ? 8 : 6;
  const multiplier = tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
  const formatted = (amount / multiplier).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  return formatted === '-0' ? '0' : formatted;
}

function getProposalPaymentBreakdown(proposal: ApiProposal, project: ApiProject) {
  const totalUnits = toAtomicUnits(proposal.proposedAmount, project.tokenType);
  const platformFeeUnits = toAtomicUnits(Number(proposal.proposedAmount) * (PLATFORM_FEE_PERCENTAGE / 100), project.tokenType);
  const compensationUnits = totalUnits - platformFeeUnits;

  if (totalUnits <= 0 || platformFeeUnits <= 0 || compensationUnits <= 0) {
    return null;
  }

  return {
    compensationAmount: fromAtomicUnits(compensationUnits, project.tokenType),
    platformFeeAmount: fromAtomicUnits(platformFeeUnits, project.tokenType),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const ReviewProposalsPage = () => {
  const location = useLocation();
  const selectedProjectId = (location.state as { projectId?: number } | null)?.projectId;
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [project, setProject] = useState<ApiProject | null>(null);
  const [proposals, setProposals] = useState<ApiProposal[]>([]);
  const [profilesByAddress, setProfilesByAddress] = useState<Record<string, ApiUserProfile>>({});
  const [reviewsByAddress, setReviewsByAddress] = useState<Record<string, ApiUserReview[]>>({});
  const [messageRecipientAddress, setMessageRecipientAddress] = useState('');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [processingProposalId, setProcessingProposalId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] = useState<{ proposalId: number; step: AcceptanceStep } | null>(null);
  const [expandedProposalId, setExpandedProposalId] = useState<number | null>(null);
  const [acceptanceProgressByProposal, setAcceptanceProgressByProposal] = useState<Record<number, ProposalAcceptanceProgress>>({});
  const [loading, setLoading] = useState(true);

  const loadProposals = useCallback(async (projectIdOverride?: number) => {
    setLoading(true);
    try {
      const postedProjects = await getMyPostedProjects();
      setProjects(postedProjects);

      const resolvedProjectId = projectIdOverride || selectedProjectId || postedProjects.filter(p => p.status !== 'completed')[0]?.id;
      if (!resolvedProjectId) {
        setProject(null);
        setProposals([]);
        return;
      }

      const [resolvedProject, resolvedProposals] = await Promise.all([
        getProject(resolvedProjectId),
        getProjectProposals(resolvedProjectId),
      ]);

      setProject(resolvedProject);
      setProposals(resolvedProposals);

      const freelancerAddresses = Array.from(
        new Set(
          resolvedProposals
            .map((proposal) => proposal.freelancerAddress)
            .filter((address): address is string => Boolean(address)),
        ),
      );

      const profileEntries = await Promise.all(
        freelancerAddresses.map(async (address) => {
          try {
            const profile = await getUserProfile(address);
            return [address, profile] as const;
          } catch {
            return null;
          }
        }),
      );

      const reviewEntries = await Promise.all(
        freelancerAddresses.map(async (address) => {
          try {
            const reviews = await getUserReviews(address);
            return [address, reviews] as const;
          } catch {
            return [address, []] as const;
          }
        }),
      );

      setProfilesByAddress(
        Object.fromEntries(profileEntries.filter((entry): entry is readonly [string, ApiUserProfile] => Boolean(entry))),
      );
      setReviewsByAddress(Object.fromEntries(reviewEntries));
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const acceptedProposal = useMemo(
    () => proposals.find((proposal) => proposal.status === 'accepted'),
    [proposals],
  );

  const finalizeProposalAcceptance = async (
    proposal: ApiProposal,
    compensation: NonNullable<ProposalAcceptanceProgress['compensation']>,
  ) => {
    if (!project) {
      return false;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'finalize' });
    setAcceptanceProgressByProposal((current) => ({
      ...current,
      [proposal.id]: {
        ...(current[proposal.id] || {}),
        error: null,
      },
    }));

    try {
      await acceptProposal(proposal.id, {
        escrowTxId: compensation.txId,
        onChainId: compensation.onChainId,
      });
      setExpandedProposalId((current) => (current === proposal.id ? null : current));
      setAcceptanceProgressByProposal((current) => {
        const next = { ...current };
        delete next[proposal.id];
        return next;
      });
      await loadProposals(project.id);
      return true;
    } catch (error) {
      console.error('Failed to finalize proposal acceptance:', error);
      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: {
          ...(current[proposal.id] || {}),
          error: getErrorMessage(error, 'Failed to finalize proposal acceptance'),
        },
      }));
      return false;
    } finally {
      setProcessingProposalId(null);
      setProcessingStep((current) => (
        current?.proposalId === proposal.id && current.step === 'finalize'
          ? null
          : current
      ));
    }
  };

  const handleAcceptProposal = async (proposal: ApiProposal) => {
    const progress = acceptanceProgressByProposal[proposal.id];
    if (progress?.compensation && progress.platformFee) {
      await finalizeProposalAcceptance(proposal, progress.compensation);
      return;
    }

    setExpandedProposalId((current) => (current === proposal.id ? null : proposal.id));
  };

  const handlePayClientCompensation = async (proposal: ApiProposal) => {
    if (!project || !proposal.freelancerAddress) {
      return;
    }

    const paymentBreakdown = getProposalPaymentBreakdown(proposal, project);
    if (!paymentBreakdown) {
      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: {
          ...(current[proposal.id] || {}),
          error: 'Unable to calculate the client compensation split for this proposal',
        },
      }));
      return;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'compensation' });
    setAcceptanceProgressByProposal((current) => ({
      ...current,
      [proposal.id]: {
        ...(current[proposal.id] || {}),
        error: null,
      },
    }));

    try {
      const escrow = await createEscrowForProject(project, proposal.freelancerAddress, paymentBreakdown.compensationAmount);
      const nextProgress: ProposalAcceptanceProgress = {
        ...(acceptanceProgressByProposal[proposal.id] || {}),
        compensation: {
          amount: paymentBreakdown.compensationAmount,
          onChainId: escrow.onChainId,
          txId: escrow.txId,
        },
        error: null,
      };

      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: nextProgress,
      }));
      setExpandedProposalId(proposal.id);

      if (nextProgress.platformFee) {
        await finalizeProposalAcceptance(proposal, nextProgress.compensation!);
      }
    } catch (error) {
      console.error('Failed to pay client compensation:', error);
      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: {
          ...(current[proposal.id] || {}),
          error: getErrorMessage(error, 'Failed to pay client compensation'),
        },
      }));
    } finally {
      setProcessingProposalId(null);
      setProcessingStep((current) => (
        current?.proposalId === proposal.id && current.step === 'compensation'
          ? null
          : current
      ));
    }
  };

  const handlePayPlatformFee = async (proposal: ApiProposal) => {
    if (!project) {
      return;
    }

    const paymentBreakdown = getProposalPaymentBreakdown(proposal, project);
    if (!paymentBreakdown) {
      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: {
          ...(current[proposal.id] || {}),
          error: 'Unable to calculate the platform fee split for this proposal',
        },
      }));
      return;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'platformFee' });
    setAcceptanceProgressByProposal((current) => ({
      ...current,
      [proposal.id]: {
        ...(current[proposal.id] || {}),
        error: null,
      },
    }));

    try {
      const payment = await preflightAcceptProposalPayment(proposal.id);
      const nextProgress: ProposalAcceptanceProgress = {
        ...(acceptanceProgressByProposal[proposal.id] || {}),
        platformFee: {
          amount: paymentBreakdown.platformFeeAmount,
          txId: payment.payment.transaction,
        },
        error: null,
      };

      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: nextProgress,
      }));
      setExpandedProposalId(proposal.id);

      if (nextProgress.compensation) {
        await finalizeProposalAcceptance(proposal, nextProgress.compensation);
      }
    } catch (error) {
      console.error('Failed to pay platform fee:', error);
      setAcceptanceProgressByProposal((current) => ({
        ...current,
        [proposal.id]: {
          ...(current[proposal.id] || {}),
          error: getErrorMessage(error, 'Failed to pay platform fee'),
        },
      }));
    } finally {
      setProcessingProposalId(null);
      setProcessingStep((current) => (
        current?.proposalId === proposal.id && current.step === 'platformFee'
          ? null
          : current
      ));
    }
  };

  const handleRejectProposal = async (proposalId: number) => {
    try {
      await rejectProposal(proposalId);
      await loadProposals(project?.id);
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };


  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <Shared.MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientAddress={messageRecipientAddress}
        />
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink mb-8 transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-2">Review Proposals</h1>
        <p className="text-muted mb-6">
          {project ? `Review and accept proposals for "${project.title}"` : 'Review incoming proposals for your posted jobs.'}
        </p>

        {projects.length > 1 && (
          <div className="card p-4 mb-8">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Select Job</label>
            <select
              value={project?.id || ''}
              onChange={(event) => loadProposals(Number(event.target.value))}
              className="w-full bg-surface text-ink border border-border rounded-[15px] px-4 py-3 text-sm outline-none"
            >
              {projects.filter(p => p.status !== 'completed').map((entry) => (
                <option key={entry.id} value={entry.id} className="bg-surface text-ink">
                  {entry.title}
                </option>
              ))}
            </select>
          </div>
        )}


        {loading ? (
          <div className="card p-6 text-sm text-muted">Loading proposals...</div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => {
              const address = proposal.freelancerAddress || '';
              const profile = address ? profilesByAddress[address] : undefined;
              const reviews = address ? reviewsByAddress[address] || [] : [];
              const acceptanceProgress = acceptanceProgressByProposal[proposal.id];
              const paymentBreakdown = project ? getProposalPaymentBreakdown(proposal, project) : null;
              const rating = reviews.length
                ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                : '0.0';
              const displayName = profile ? toDisplayName(profile) : toDisplayName({ name: proposal.freelancerName, username: proposal.freelancerUsername, stxAddress: address || `freelancer-${proposal.freelancerId}` });
              const canAcceptProposal = proposal.status === 'pending';
              const hasCompletedBothPayments = Boolean(acceptanceProgress?.compensation && acceptanceProgress.platformFee);
              const isProcessingThisProposal = processingProposalId === proposal.id;
              const isProcessingCompensation = processingStep?.proposalId === proposal.id && processingStep.step === 'compensation';
              const isProcessingPlatformFee = processingStep?.proposalId === proposal.id && processingStep.step === 'platformFee';
              const isFinalizingAcceptance = processingStep?.proposalId === proposal.id && processingStep.step === 'finalize';
              const isBlockedByOtherAcceptedProposal = Boolean(acceptedProposal && acceptedProposal.id !== proposal.id && project?.status !== 'active');

              return (
                <div key={proposal.id} className="card p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-[10px] bg-ink/10 overflow-hidden flex items-center justify-center font-black">
                        {displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{displayName}</h3>
                        <p className="text-xs text-muted">
                          {address ? formatAddress(address) : `Freelancer #${proposal.freelancerId}`} • <Star size={12} className="inline text-accent-orange fill-accent-orange mb-0.5" /> {rating}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-black text-xl text-accent-cyan capitalize">{proposal.status}</p>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{formatRelativeTime(proposal.createdAt)}</p>
                    </div>
                  </div>
                  <div className="bg-ink/5 rounded-[15px] p-4 mb-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Proposed Amount</p>
                      <p className="font-black text-lg text-accent-cyan">
                        {formatTokenAmount(proposal.proposedAmount)} {project?.tokenType}
                      </p>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{proposal.coverLetter}</p>
                  </div>
                  {expandedProposalId === proposal.id && canAcceptProposal && (
                    <div className="bg-ink/5 rounded-[15px] p-4 mb-6">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Complete Acceptance Payments</p>
                        <p className="font-black text-lg text-accent-cyan">{project?.tokenType}</p>
                      </div>
                      {paymentBreakdown ? (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2 mb-4">
                            <button
                              onClick={() => handlePayClientCompensation(proposal)}
                              disabled={Boolean(acceptanceProgress?.compensation) || isProcessingThisProposal || !proposal.freelancerAddress || isBlockedByOtherAcceptedProposal}
                              className="btn-primary py-3 justify-center disabled:opacity-50"
                            >
                              {acceptanceProgress?.compensation
                                ? 'Client Compensation Paid'
                                : isProcessingCompensation
                                  ? 'Opening Wallet...'
                                  : 'Pay Client Compensation'}
                            </button>
                            <button
                              onClick={() => handlePayPlatformFee(proposal)}
                              disabled={Boolean(acceptanceProgress?.platformFee) || isProcessingThisProposal || isBlockedByOtherAcceptedProposal}
                              className="btn-outline py-3 justify-center disabled:opacity-50"
                            >
                              {acceptanceProgress?.platformFee
                                ? 'Platform Fee Paid'
                                : isProcessingPlatformFee
                                  ? 'Opening Wallet...'
                                  : 'Pay Platform Fee'}
                            </button>
                          </div>
                          <div className="space-y-2 text-sm text-muted">
                            <div className="flex items-center justify-between gap-4">
                              <p>Client compensation</p>
                              <p className="font-bold text-ink">{formatTokenAmount(paymentBreakdown.compensationAmount)} {project?.tokenType}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <p>Platform fee</p>
                              <p className="font-bold text-ink">{formatTokenAmount(paymentBreakdown.platformFeeAmount)} {project?.tokenType}</p>
                            </div>
                          </div>
                          {hasCompletedBothPayments && !isFinalizingAcceptance && (
                            <p className="text-xs text-muted mt-4">Both payments are complete. Click Accept Proposal again if final assignment does not finish automatically.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted">Unable to calculate the payment split for this proposal.</p>
                      )}
                      {acceptanceProgress?.error && (
                        <p className="text-xs text-red-400 mt-4">{acceptanceProgress.error}</p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={() => handleAcceptProposal(proposal)}
                      disabled={(!canAcceptProposal && !hasCompletedBothPayments) || isProcessingThisProposal || isBlockedByOtherAcceptedProposal}
                      className="flex-1 btn-primary py-3 justify-center disabled:opacity-50"
                    >
                      {proposal.status === 'accepted'
                        ? 'Accepted'
                        : isFinalizingAcceptance
                          ? 'Finalizing...'
                          : hasCompletedBothPayments
                            ? 'Finalize Acceptance'
                            : expandedProposalId === proposal.id
                              ? 'Hide Payment Steps'
                              : 'Accept Proposal'}
                    </button>
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      disabled={proposal.status !== 'pending' || isProcessingThisProposal}
                      className="flex-1 btn-outline py-3 justify-center disabled:opacity-50"
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => {
                        setMessageRecipientAddress(proposal.freelancerAddress || '');
                        setIsMessageModalOpen(true);
                      }}
                      className="flex-1 btn-outline py-3 justify-center"
                    >
                      Message
                    </button>
                  </div>
                </div>
              );
            })}
            {proposals.length === 0 && <div className="card p-6 text-sm text-muted">No proposals found for this job yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
};
