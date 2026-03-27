import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import * as Shared from '../shared';
import {
  acceptProposal,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getProposalAcceptanceStatus,
  getMyPostedProjects,
  getProject,
  getProjectProposals,
  preflightAcceptProposalPayment,
  recordProposalCompensationPayment,
  getUserProfile,
  getUserReviews,
  rejectProposal,
  toDisplayName,
  type ApiProposalAcceptanceProgress,
  type ApiProposal,
} from '../lib/api';
import { createEscrowForProject } from '../lib/escrow';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview } from '../types/user';
import { calculateProposalAcceptanceAmounts } from '../../../shared/proposal-acceptance';

type AcceptanceStep = 'compensation' | 'platformFee' | 'finalize';

function getProposalPaymentBreakdown(proposal: ApiProposal, progress?: ApiProposalAcceptanceProgress | null) {
  if (progress) {
    return {
      compensationAmount: progress.compensationAmount,
      platformFeeAmount: progress.platformFeeAmount,
    };
  }

  try {
    return calculateProposalAcceptanceAmounts(proposal.proposedAmount, '10');
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getAcceptanceError(progress?: ApiProposalAcceptanceProgress | null, fallback?: string | null) {
  return fallback || progress?.compensation.error || progress?.platformFee.error || null;
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
  const [acceptanceProgressByProposal, setAcceptanceProgressByProposal] = useState<Record<number, ApiProposalAcceptanceProgress>>({});
  const [acceptanceErrorsByProposal, setAcceptanceErrorsByProposal] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const setProposalAcceptanceProgress = useCallback((proposalId: number, progress: ApiProposalAcceptanceProgress | null) => {
    setAcceptanceProgressByProposal((current) => {
      const next = { ...current };
      if (progress) {
        next[proposalId] = progress;
      } else {
        delete next[proposalId];
      }
      return next;
    });
  }, []);

  const setProposalAcceptanceError = useCallback((proposalId: number, error: string | null) => {
    setAcceptanceErrorsByProposal((current) => {
      const next = { ...current };
      if (error) {
        next[proposalId] = error;
      } else {
        delete next[proposalId];
      }
      return next;
    });
  }, []);

  const refreshProposalAcceptanceStatus = useCallback(async (proposalId: number) => {
    const response = await getProposalAcceptanceStatus(proposalId);
    setProposalAcceptanceProgress(proposalId, response.progress);
    setProposalAcceptanceError(proposalId, getAcceptanceError(response.progress, null));
    return response.progress;
  }, [setProposalAcceptanceError, setProposalAcceptanceProgress]);

  const loadProposals = useCallback(async (projectIdOverride?: number) => {
    setLoading(true);
    try {
      const postedProjects = await getMyPostedProjects();
      setProjects(postedProjects);

      const resolvedProjectId = projectIdOverride || selectedProjectId || postedProjects.filter(p => p.status !== 'completed')[0]?.id;
      if (!resolvedProjectId) {
        setProject(null);
        setProposals([]);
        setAcceptanceProgressByProposal({});
        setAcceptanceErrorsByProposal({});
        setExpandedProposalId(null);
        return;
      }

      const [resolvedProject, resolvedProposals] = await Promise.all([
        getProject(resolvedProjectId),
        getProjectProposals(resolvedProjectId),
      ]);

      setProject(resolvedProject);
      setProposals(resolvedProposals);
      setExpandedProposalId(null);

      const progressEntries = await Promise.all(
        resolvedProposals
          .filter((proposal) => proposal.status === 'pending')
          .map(async (proposal) => {
            try {
              const response = await getProposalAcceptanceStatus(proposal.id);
              return [proposal.id, response.progress] as const;
            } catch {
              return null;
            }
          }),
      );

      setAcceptanceProgressByProposal(
        Object.fromEntries(
          progressEntries.filter(
            (entry): entry is readonly [number, ApiProposalAcceptanceProgress] => Boolean(entry?.[1]),
          ),
        ),
      );
      setAcceptanceErrorsByProposal({});

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

  const finalizeProposalAcceptance = async (proposal: ApiProposal) => {
    if (!project) {
      return false;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'finalize' });
    setProposalAcceptanceError(proposal.id, null);

    try {
      await acceptProposal(proposal.id);
      setExpandedProposalId((current) => (current === proposal.id ? null : current));
      setProposalAcceptanceError(proposal.id, null);
      await loadProposals(project.id);
      return true;
    } catch (error) {
      console.error('Failed to finalize proposal acceptance:', error);
      setProposalAcceptanceError(proposal.id, getErrorMessage(error, 'Failed to finalize proposal acceptance'));
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
    if (progress?.canFinalize) {
      await finalizeProposalAcceptance(proposal);
      return;
    }

    if (progress?.compensation.status === 'pending') {
      try {
        const refreshedProgress = await refreshProposalAcceptanceStatus(proposal.id);
        if (refreshedProgress?.canFinalize) {
          await finalizeProposalAcceptance(proposal);
          return;
        }
      } catch (error) {
        setProposalAcceptanceError(proposal.id, getErrorMessage(error, 'Failed to refresh compensation verification status'));
      }
    }

    if (progress?.platformFee.status === 'confirmed' && progress?.compensation.status === 'confirmed') {
      await finalizeProposalAcceptance(proposal);
      return;
    }

    setProposalAcceptanceError(proposal.id, null);
    setExpandedProposalId((current) => (current === proposal.id ? null : proposal.id));
  };

  const handlePayClientCompensation = async (proposal: ApiProposal) => {
    if (!project || !proposal.freelancerAddress) {
      return;
    }

    const paymentBreakdown = getProposalPaymentBreakdown(proposal, acceptanceProgressByProposal[proposal.id]);
    if (!paymentBreakdown) {
      setProposalAcceptanceError(proposal.id, 'Unable to calculate the client compensation split for this proposal');
      return;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'compensation' });
    setProposalAcceptanceError(proposal.id, null);

    try {
      const escrow = await createEscrowForProject(project, proposal.freelancerAddress, paymentBreakdown.compensationAmount);
      const response = await recordProposalCompensationPayment(proposal.id, {
        escrowTxId: escrow.txId,
        onChainId: escrow.onChainId,
      });

      if (response.progress) {
        setProposalAcceptanceProgress(proposal.id, response.progress);
        setProposalAcceptanceError(proposal.id, getAcceptanceError(response.progress, null));
      }
      setExpandedProposalId(proposal.id);

      if (response.progress?.canFinalize) {
        await finalizeProposalAcceptance(proposal);
      }
    } catch (error) {
      console.error('Failed to pay client compensation:', error);
      setProposalAcceptanceError(proposal.id, getErrorMessage(error, 'Failed to pay client compensation'));
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

    const paymentBreakdown = getProposalPaymentBreakdown(proposal, acceptanceProgressByProposal[proposal.id]);
    if (!paymentBreakdown) {
      setProposalAcceptanceError(proposal.id, 'Unable to calculate the platform fee split for this proposal');
      return;
    }

    setProcessingProposalId(proposal.id);
    setProcessingStep({ proposalId: proposal.id, step: 'platformFee' });
    setProposalAcceptanceError(proposal.id, null);

    try {
      const payment = await preflightAcceptProposalPayment(proposal.id);
      if (payment.progress) {
        setProposalAcceptanceProgress(proposal.id, payment.progress);
        setProposalAcceptanceError(proposal.id, getAcceptanceError(payment.progress, null));
      } else {
        await refreshProposalAcceptanceStatus(proposal.id);
      }
      setExpandedProposalId(proposal.id);

      if (payment.progress?.canFinalize) {
        await finalizeProposalAcceptance(proposal);
      }
    } catch (error) {
      console.error('Failed to pay platform fee:', error);
      setProposalAcceptanceError(proposal.id, getErrorMessage(error, 'Failed to pay platform fee'));
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
              const paymentBreakdown = getProposalPaymentBreakdown(proposal, acceptanceProgress);
              const acceptanceError = getAcceptanceError(acceptanceProgress, acceptanceErrorsByProposal[proposal.id] || null);
              const rating = reviews.length
                ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                : '0.0';
              const displayName = profile ? toDisplayName(profile) : toDisplayName({ name: proposal.freelancerName, username: proposal.freelancerUsername, stxAddress: address || `freelancer-${proposal.freelancerId}` });
              const canAcceptProposal = proposal.status === 'pending';
              const hasCompletedBothPayments = Boolean(acceptanceProgress?.canFinalize);
              const isProcessingThisProposal = processingProposalId === proposal.id;
              const isProcessingCompensation = processingStep?.proposalId === proposal.id && processingStep.step === 'compensation';
              const isProcessingPlatformFee = processingStep?.proposalId === proposal.id && processingStep.step === 'platformFee';
              const isFinalizingAcceptance = processingStep?.proposalId === proposal.id && processingStep.step === 'finalize';
              const isBlockedByOtherAcceptedProposal = Boolean(acceptedProposal && acceptedProposal.id !== proposal.id && project?.status !== 'active');
              const compensationLocked = acceptanceProgress?.compensation.status === 'confirmed' || acceptanceProgress?.compensation.status === 'pending';
              const platformFeeLocked = acceptanceProgress?.platformFee.status === 'confirmed';

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
                              disabled={compensationLocked || isProcessingThisProposal || !proposal.freelancerAddress || isBlockedByOtherAcceptedProposal}
                              className="btn-primary py-3 justify-center disabled:opacity-50"
                            >
                              {acceptanceProgress?.compensation.status === 'confirmed'
                                ? 'Client Compensation Paid'
                                : acceptanceProgress?.compensation.status === 'pending'
                                  ? 'Compensation Submitted'
                                : isProcessingCompensation
                                  ? 'Opening Wallet...'
                                  : 'Pay Client Compensation'}
                            </button>
                            <button
                              onClick={() => handlePayPlatformFee(proposal)}
                              disabled={platformFeeLocked || isProcessingThisProposal || isBlockedByOtherAcceptedProposal}
                              className="btn-outline py-3 justify-center disabled:opacity-50"
                            >
                              {acceptanceProgress?.platformFee.status === 'confirmed'
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
                          {acceptanceProgress?.compensation.status === 'pending' && (
                            <p className="text-xs text-muted mt-4">The escrow contract call has been submitted and is being verified on-chain. You will not be charged again for this step.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted">Unable to calculate the payment split for this proposal.</p>
                      )}
                      {acceptanceError && (
                        <p className="text-xs text-red-400 mt-4">{acceptanceError}</p>
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
