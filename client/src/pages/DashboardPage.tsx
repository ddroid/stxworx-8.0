import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star } from 'lucide-react';
import * as Shared from '../shared';
import {
  createReview,
  type ApiMilestoneSubmission,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getMyActiveProjects,
  getMyCompletedProjects,
  getMyReviews,
  getMyPostedProjects,
  getProjectMilestones,
  getProjectProposals,
  getUserProfile,
  getUserReviews,
  toAppJob,
} from '../lib/api';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview } from '../types/user';

type MilestoneView = {
  projectId: number;
  projectOnChainId?: number | null;
  freelancerAddress?: string;
  milestoneNum: number;
  title: string;
  description: string;
  amount: string;
  tokenType: ApiProject['tokenType'];
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  deliverableUrl?: string;
};

function buildMilestones(project: ApiProject, submissions: ApiMilestoneSubmission[]): MilestoneView[] {
  const mapped = toAppJob(project).milestones;

  return mapped.map((milestone, index) => {
    const milestoneNum = index + 1;
    const submission = submissions.find((entry) => entry.milestoneNum === milestoneNum);

    return {
      projectId: project.id,
      projectOnChainId: project.onChainId,
      freelancerAddress: project.freelancerAddress,
      milestoneNum,
      title: `${milestoneNum}. ${milestone.title}`,
      description: milestone.description,
      amount: `${formatTokenAmount(milestone.amount)} ${project.tokenType}`,
      tokenType: project.tokenType,
      status: submission?.status === 'submitted' || submission?.status === 'approved' || submission?.status === 'rejected'
        ? submission.status
        : 'pending',
      deliverableUrl: submission?.deliverableUrl,
    };
  });
}

export const DashboardPage = () => {
  const { userRole, walletAddress } = Shared.useWallet();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneView | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedRecipientAddress, setSelectedRecipientAddress] = useState('');
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [postedProjects, setPostedProjects] = useState<ApiProject[]>([]);
  const [activeProjects, setActiveProjects] = useState<ApiProject[]>([]);
  const [completedProjects, setCompletedProjects] = useState<ApiProject[]>([]);
  const [proposalCounts, setProposalCounts] = useState<Record<number, number>>({});
  const [milestonesByProject, setMilestonesByProject] = useState<Record<number, ApiMilestoneSubmission[]>>({});
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [reviews, setReviews] = useState<ApiUserReview[]>([]);
  const [myReviews, setMyReviews] = useState<ApiUserReview[]>([]);
  const [ratingProjectId, setRatingProjectId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSubmitWork = (milestone: MilestoneView) => {
    setSelectedMilestone(milestone);
    setIsSubmitModalOpen(true);
  };

  const handleOpenMessage = (recipientAddress: string) => {
    setSelectedRecipientAddress(recipientAddress);
    setIsMessageModalOpen(true);
  };

  const handleOpenReview = (projectId: number) => {
    setRatingProjectId(projectId);
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
  };

  const handleCancelReview = () => {
    setRatingProjectId(null);
    setReviewRating(5);
    setReviewComment('');
    setReviewError(null);
  };

  const loadDashboardData = useCallback(async () => {
    if (!walletAddress) {
      return;
    }

    setLoading(true);
    try {
      const [posted, active, completed, userProfile, userReviews, authoredReviews] = await Promise.all([
        getMyPostedProjects(),
        getMyActiveProjects(),
        getMyCompletedProjects(),
        getUserProfile(walletAddress),
        getUserReviews(walletAddress).catch(() => []),
        getMyReviews().catch(() => []),
      ]);

      setPostedProjects(posted);
      setActiveProjects(active);
      setCompletedProjects(completed);
      setProfile(userProfile);
      setReviews(userReviews);
      setMyReviews(authoredReviews);

      const [proposalEntries, milestoneEntries] = await Promise.all([
        Promise.all(
          posted.map(async (project) => {
            try {
              const proposals = await getProjectProposals(project.id);
              return [project.id, proposals.length] as const;
            } catch {
              return [project.id, 0] as const;
            }
          }),
        ),
        Promise.all(
          [...active, ...completed].map(async (project) => {
            try {
              const submissions = await getProjectMilestones(project.id);
              return [project.id, submissions] as const;
            } catch {
              return [project.id, []] as const;
            }
          }),
        ),
      ]);

      setProposalCounts(Object.fromEntries(proposalEntries));
      setMilestonesByProject(Object.fromEntries(milestoneEntries));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const ratingAverage = useMemo(() => {
    if (reviews.length === 0) {
      return '0.0';
    }

    return (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const reviewsByProjectId = useMemo(
    () => Object.fromEntries(myReviews.map((review) => [review.projectId, review])),
    [myReviews],
  );

  const totalSpent = useMemo(
    () =>
      Array.from(new Map([...postedProjects, ...activeProjects, ...completedProjects].map((project) => [project.id, project])).values()).reduce(
        (sum, project) => sum + Number(project.budget || 0),
        0,
      ),
    [activeProjects, completedProjects, postedProjects],
  );

  const activeEscrow = useMemo(
    () => activeProjects.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    [activeProjects],
  );

  const handleSubmitReview = async (project: ApiProject) => {
    if (!project.freelancerId || reviewSubmitting) {
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const reviewData = {
        projectId: Number(project.id),
        rating: Number(reviewRating),
        comment: reviewComment.trim() || undefined,
      };
      console.log('Submitting review:', reviewData);
      console.log('Project:', project);
      
      await createReview(reviewData);
      handleCancelReview();
      await loadDashboardData();
    } catch (error) {
      console.error('Review submission error:', error);
      setReviewError(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-3xl font-black mb-4">Dashboard</h2>
          <p className="text-muted text-center max-w-md">Connect your wallet to see your personalized dashboard data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <Shared.MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientAddress={selectedRecipientAddress}
        />
        <Shared.PostJobModal
          isOpen={isPostJobModalOpen}
          onClose={() => setIsPostJobModalOpen(false)}
          onCreated={loadDashboardData}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-2">{userRole === 'client' ? 'Client Dashboard' : 'Freelancer Dashboard'}</h1>
            <p className="text-muted">
              {userRole === 'client' ? 'Manage your job postings, active contracts, and escrow.' : 'Manage your active contracts, earnings, and reputation.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-sm text-muted">Loading dashboard...</div>
        ) : userRole === 'client' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Shared.StatCard value={`${postedProjects.filter((project) => project.status === 'open').length}`} label="Active Postings" color="bg-accent-orange" />
              <Shared.StatCard value={`${activeProjects.length}`} label="Active Contracts" color="bg-accent-cyan" />
              <Shared.StatCard value={`${formatTokenAmount(activeEscrow)}`} label="Total Escrow Locked" color="bg-accent-blue" />
              <Shared.StatCard value={`${formatTokenAmount(totalSpent)}`} label="Total Spent" color="bg-accent-yellow" />
            </div>

            <div className="card mb-8">
              <h3 className="font-bold text-xl mb-6">Active Contracts ({activeProjects.length})</h3>
              <div className="space-y-6">
                {activeProjects.map((project) => {
                  const submissions = milestonesByProject[project.id] || [];
                  const milestones = buildMilestones(project, submissions);
                  const pendingReview = submissions.find((submission) => submission.status === 'submitted');
                  const approvedCount = submissions.filter((submission) => submission.status === 'approved').length;
                  const progressWidth = `${Math.min(100, Math.round((approvedCount / Math.max(project.numMilestones || 1, 1)) * 100))}%`;
                  const currentMilestone = milestones.find((milestone) => milestone.status !== 'approved') || milestones[milestones.length - 1];

                  return (
                    <div key={project.id} className="border border-border rounded-[15px] p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">Freelancer: {formatAddress(project.freelancerAddress || '')}</p>
                        </div>
                        <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange rounded-full text-[10px] font-bold uppercase tracking-widest">{project.status}</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-muted mb-2">Current Milestone: <span className="text-ink font-bold">{currentMilestone?.title || 'N/A'}</span></p>
                        <div className="w-full bg-ink/10 h-2 rounded-full overflow-hidden">
                          <div className="bg-accent-orange h-full" style={{ width: progressWidth }}></div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Escrow Status</p>
                          <p className="font-bold text-accent-cyan flex items-center gap-1"><ShieldCheck size={14} /> Locked ({formatTokenAmount(project.budget)} {project.tokenType})</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <button onClick={() => handleOpenMessage(project.freelancerAddress || 'Freelancer')} className="btn-outline py-2 px-4 text-xs flex items-center justify-center w-full sm:w-auto">Message</button>
                          {pendingReview ? (
                            <Link to="/review-work" state={{ projectId: project.id, submissionId: pendingReview.id }} className="btn-primary py-2 px-4 text-xs flex items-center justify-center w-full sm:w-auto">Review Work</Link>
                          ) : (
                            <button disabled className="btn-primary py-2 px-4 text-xs flex items-center justify-center w-full sm:w-auto opacity-50 cursor-not-allowed">No Submission Yet</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && <div className="text-sm text-muted">No active contracts yet.</div>}
              </div>
            </div>

            <div className="card mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h3 className="font-bold text-xl">Active Job Postings</h3>
                <button onClick={() => setIsPostJobModalOpen(true)} className="btn-primary py-2 px-4 text-xs w-full sm:w-auto justify-center">Post New Job</button>
              </div>
              <div className="space-y-6">
                {postedProjects.filter(p => p.status === 'open').map((project) => {
                  const milestones = buildMilestones(project, milestonesByProject[project.id] || []);
                  return (
                    <div key={project.id} className="border border-border rounded-[15px] p-6 bg-ink/5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">Posted {formatRelativeTime(project.createdAt)}</p>
                        </div>
                        <span className="px-3 py-1 bg-accent-cyan/10 text-accent-cyan rounded-full text-[10px] font-bold uppercase tracking-widest">{project.status}</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-muted mb-2">Milestones:</p>
                        <ul className="list-disc list-inside text-sm text-muted space-y-1">
                          {milestones.map((milestone) => (
                            <li key={milestone.milestoneNum}>{milestone.title} ({milestone.amount})</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Budget</p>
                          <p className="font-bold">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Proposals</p>
                          <p className="font-bold">{proposalCounts[project.id] ?? 0}</p>
                        </div>
                        <div className="flex-1 sm:text-right">
                          <Link to="/review-proposals" state={{ projectId: project.id }} className="text-accent-orange text-xs font-bold hover:underline">View Proposals</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {postedProjects.filter(p => p.status === 'open').length === 0 && <div className="text-sm text-muted">You have no active job postings.</div>}
              </div>
            </div>

            {completedProjects.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-xl mb-6">Completed Job Postings</h3>
                <div className="space-y-6">
                  {completedProjects.map((project) => {
                    const milestones = buildMilestones(project, milestonesByProject[project.id] || []);
                    const submittedReview = reviewsByProjectId[project.id];
                    return (
                      <div key={project.id} className="border border-border rounded-[15px] p-6 bg-ink/5">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                          <div>
                            <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                            <p className="text-xs text-muted">Posted {formatRelativeTime(project.createdAt)}{project.freelancerAddress ? ` • Freelancer: ${formatAddress(project.freelancerAddress)}` : ''}</p>
                          </div>
                          <span className="px-3 py-1 bg-accent-cyan/10 text-accent-cyan rounded-full text-[10px] font-bold uppercase tracking-widest">{project.status}</span>
                        </div>
                        <div className="mb-4">
                          <p className="text-sm text-muted mb-2">Milestones:</p>
                          <ul className="list-disc list-inside text-sm text-muted space-y-1">
                            {milestones.map((milestone) => (
                              <li key={milestone.milestoneNum}>{milestone.title} ({milestone.amount})</li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Budget</p>
                            <p className="font-bold">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Freelancer</p>
                            <p className="font-bold">{project.freelancerAddress ? formatAddress(project.freelancerAddress) : 'Unassigned'}</p>
                          </div>
                          <div className="flex-1 sm:text-right">
                            {submittedReview ? (
                              <div className="inline-flex items-center gap-1 text-sm font-bold">
                                <Star size={14} className="text-accent-orange fill-accent-orange" />
                                {submittedReview.rating.toFixed(1)}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenReview(project.id)}
                                disabled={!project.freelancerId}
                                className="btn-primary py-2 px-4 text-xs justify-center disabled:opacity-50"
                              >
                                Rate Freelancer
                              </button>
                            )}
                          </div>
                        </div>
                        {submittedReview && (
                          <div className="mt-4 border-t border-border pt-4">
                            <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-2">Your Review</p>
                            <p className="text-sm text-muted leading-relaxed">{submittedReview.comment || 'You left a rating without written feedback.'}</p>
                          </div>
                        )}
                        {ratingProjectId === project.id && !submittedReview && (
                          <div className="mt-4 border-t border-border pt-4">
                            <p className="text-sm font-bold mb-3">Rate this freelancer</p>
                            <div className="flex items-center gap-2 mb-4">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setReviewRating(value)}
                                  className="transition-transform hover:scale-105"
                                >
                                  <Star
                                    size={20}
                                    className={value <= reviewRating ? 'text-accent-orange fill-accent-orange' : 'text-muted'}
                                  />
                                </button>
                              ))}
                              <span className="text-sm font-bold ml-2">{reviewRating.toFixed(1)}</span>
                            </div>
                            <textarea
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              placeholder="Share a quick note about the completed work"
                              className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none min-h-[110px]"
                            />
                            {reviewError && <p className="text-xs text-red-500 mt-3">{reviewError}</p>}
                            <div className="flex justify-end gap-3 mt-4">
                              <button onClick={handleCancelReview} className="btn-outline py-2 px-4 text-xs justify-center">
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSubmitReview(project)}
                                disabled={reviewSubmitting}
                                className="btn-primary py-2 px-4 text-xs justify-center disabled:opacity-50"
                              >
                                {reviewSubmitting ? 'Submitting...' : 'Submit Rating'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {completedProjects.length === 0 && (
              <div className="card">
                <h3 className="font-bold text-xl mb-3">Completed Job Postings</h3>
                <div className="text-sm text-muted">No completed jobs yet.</div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Shared.StatCard value={`${activeProjects.length}`} label="Active Contracts" color="bg-accent-orange" />
              <Shared.StatCard value={`${completedProjects.length}`} label="Completed Contracts" color="bg-accent-green" />
              <Shared.StatCard value={`${formatTokenAmount(profile?.totalEarned)}`} label="Total Earned" color="bg-accent-blue" />
              <Shared.StatCard value={ratingAverage} label="Reputation Score" color="bg-accent-yellow" />
            </div>

            <div className="card">
              <h3 className="font-bold text-xl mb-6">Active Contracts</h3>
              <div className="space-y-6">
                {activeProjects.map((project) => {
                  const milestones = buildMilestones(project, milestonesByProject[project.id] || []);

                  return (
                    <div key={project.id} className="border border-border rounded-[15px] p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">Client: {formatAddress(project.clientAddress || '')}</p>
                        </div>
                        <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange rounded-full text-[10px] font-bold uppercase tracking-widest">{project.status}</span>
                      </div>

                      <div className="mb-6">
                        <h5 className="text-sm font-bold mb-3">Milestones</h5>
                        <div className="space-y-2">
                          {milestones.map((milestone) => (
                            <div key={milestone.milestoneNum} className={`flex items-center justify-between ${milestone.status === 'approved' ? 'opacity-60' : ''}`}>
                              <div>
                                <p className="text-sm font-bold">{milestone.title}</p>
                                <p className="text-xs text-muted">{milestone.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{milestone.amount}</p>
                                {milestone.status === 'pending' ? (
                                  <button
                                    onClick={() => handleSubmitWork(milestone)}
                                    className="text-xs text-accent-cyan font-bold hover:underline mt-1"
                                  >
                                    Submit Work
                                  </button>
                                ) : milestone.status === 'rejected' ? (
                                  <button
                                    onClick={() => handleSubmitWork(milestone)}
                                    className="text-xs text-accent-orange font-bold hover:underline mt-1"
                                  >
                                    Resubmit Work
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted mt-1 block capitalize">{milestone.status}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Escrow Status</p>
                          <p className="font-bold text-accent-cyan flex items-center gap-1"><ShieldCheck size={14} /> Funded ({formatTokenAmount(project.budget)} {project.tokenType})</p>
                        </div>
                        <button onClick={() => handleOpenMessage(project.clientAddress || 'Client')} className="btn-outline py-2 px-4 text-xs flex items-center justify-center w-full sm:w-auto">Message Client</button>
                      </div>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && <div className="text-sm text-muted">No active contracts yet.</div>}
              </div>
            </div>

            {completedProjects.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-xl mb-6">Completed Contracts</h3>
                <div className="space-y-6">
                  {completedProjects.map((project) => {
                    const milestones = buildMilestones(project, milestonesByProject[project.id] || []);
                    const submittedReview = reviewsByProjectId[project.id];

                    return (
                      <div key={project.id} className="border border-border rounded-[15px] p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                          <div>
                            <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                            <p className="text-xs text-muted">Client: {formatAddress(project.clientAddress || '')}</p>
                          </div>
                          <span className="px-3 py-1 bg-accent-green/10 text-accent-green rounded-full text-[10px] font-bold uppercase tracking-widest">Completed</span>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-muted mb-2">Completed {formatRelativeTime(project.updatedAt)}</p>
                        </div>

                        <div className="mb-6">
                          <h5 className="text-sm font-bold mb-3">Milestones</h5>
                          <div className="space-y-2">
                            {milestones.map((milestone) => (
                              <div key={milestone.milestoneNum} className="flex items-center justify-between opacity-60">
                                <div>
                                  <p className="text-sm font-bold">{milestone.title}</p>
                                  <p className="text-xs text-muted">{milestone.description}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{milestone.amount}</p>
                                  <span className="text-xs text-muted mt-1 block capitalize">{milestone.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
                          <div>
                            <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Total Earned</p>
                            <p className="font-bold text-accent-green">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                          </div>
                          <div className="sm:text-right">
                            {submittedReview ? (
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Star size={16} className="text-accent-yellow fill-accent-yellow" />
                                  <span className="text-sm font-bold">{submittedReview.rating}.0</span>
                                </div>
                                <p className="text-xs text-muted">Rated by client</p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted">Not yet rated</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Shared.MilestoneSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        milestone={selectedMilestone}
        onSubmitted={loadDashboardData}
      />
    </div>
  );
};
