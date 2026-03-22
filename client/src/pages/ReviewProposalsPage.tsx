import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import * as Shared from '../shared';
import {
  activateProject,
  acceptProposal,
  formatAddress,
  formatRelativeTime,
  getMyPostedProjects,
  getProject,
  getProjectProposals,
  getUserProfile,
  getUserReviews,
  rejectProposal,
  toDisplayName,
  type ApiProposal,
} from '../lib/api';
import { createEscrowForProject } from '../lib/escrow';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview } from '../types/user';

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

  const handleAcceptProposal = async (proposal: ApiProposal) => {
    if (!project || !proposal.freelancerAddress) {
      return;
    }

    setProcessingProposalId(proposal.id);
    try {
      const escrow = await createEscrowForProject(project, proposal.freelancerAddress);

      if (proposal.status === 'pending') {
        await acceptProposal(proposal.id);
      }

      await activateProject(project.id, {
        escrowTxId: escrow.txId,
        onChainId: escrow.onChainId,
        tokenType: project.tokenType,
      });
      await loadProposals(project?.id);
    } catch (error) {
      console.error('Failed to accept proposal:', error);
    } finally {
      setProcessingProposalId(null);
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
              const rating = reviews.length
                ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
                : '0.0';
              const displayName = profile ? toDisplayName(profile) : toDisplayName({ name: proposal.freelancerName, username: proposal.freelancerUsername, stxAddress: address || `freelancer-${proposal.freelancerId}` });
              const canFundEscrow = proposal.status === 'accepted' && project?.status !== 'active';
              const canAcceptProposal = proposal.status === 'pending' || canFundEscrow;

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
                    <p className="text-sm text-muted leading-relaxed">{proposal.coverLetter}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      onClick={() => handleAcceptProposal(proposal)}
                      disabled={!canAcceptProposal || processingProposalId === proposal.id || Boolean(acceptedProposal && acceptedProposal.id !== proposal.id && project?.status !== 'active')}
                      className="flex-1 btn-primary py-3 justify-center disabled:opacity-50"
                    >
                      {processingProposalId === proposal.id
                        ? 'Opening Wallet...'
                        : canFundEscrow
                          ? 'Fund Escrow'
                          : proposal.status === 'accepted'
                            ? 'Accepted'
                            : 'Accept Proposal'}
                    </button>
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      disabled={proposal.status !== 'pending' || processingProposalId === proposal.id}
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
