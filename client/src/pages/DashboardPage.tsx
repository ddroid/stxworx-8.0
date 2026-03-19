import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import * as Shared from '../shared';
import {
  type ApiMilestoneSubmission,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getMyActiveProjects,
  getMyCompletedProjects,
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
  milestoneNum: number;
  title: string;
  description: string;
  amount: string;
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
      milestoneNum,
      title: `${milestoneNum}. ${milestone.title}`,
      description: milestone.description,
      amount: `${formatTokenAmount(milestone.amount)} ${project.tokenType}`,
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
  const [loading, setLoading] = useState(true);

  const handleSubmitWork = (milestone: MilestoneView) => {
    setSelectedMilestone(milestone);
    setIsSubmitModalOpen(true);
  };

  const handleOpenMessage = (recipientAddress: string) => {
    setSelectedRecipientAddress(recipientAddress);
    setIsMessageModalOpen(true);
  };

  const loadDashboardData = useCallback(async () => {
    if (!walletAddress) {
      return;
    }

    setLoading(true);
    try {
      const [posted, active, completed, userProfile, userReviews] = await Promise.all([
        getMyPostedProjects(),
        getMyActiveProjects(),
        getMyCompletedProjects(),
        getUserProfile(walletAddress),
        getUserReviews(walletAddress).catch(() => []),
      ]);

      setPostedProjects(posted);
      setActiveProjects(active);
      setCompletedProjects(completed);
      setProfile(userProfile);
      setReviews(userReviews);

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
          active.map(async (project) => {
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

  const totalSpent = useMemo(
    () =>
      [...postedProjects, ...activeProjects, ...completedProjects].reduce(
        (sum, project) => sum + Number(project.budget || 0),
        0,
      ),
    [activeProjects, completedProjects, postedProjects],
  );

  const activeEscrow = useMemo(
    () => activeProjects.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    [activeProjects],
  );

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
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">{userRole === 'client' ? 'Client Dashboard' : 'Freelancer Dashboard'}</h1>
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl">Active Job Postings</h3>
                <button onClick={() => setIsPostJobModalOpen(true)} className="btn-primary py-2 px-4 text-xs">Post New Job</button>
              </div>
              <div className="space-y-6">
                {postedProjects.map((project) => {
                  const milestones = buildMilestones(project, milestonesByProject[project.id] || []);
                  return (
                    <div key={project.id} className="border border-border rounded-[15px] p-6 bg-ink/5">
                      <div className="flex justify-between items-start mb-4">
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
                      <div className="flex gap-4 border-t border-border pt-4">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Budget</p>
                          <p className="font-bold">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Proposals</p>
                          <p className="font-bold">{proposalCounts[project.id] ?? 0}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <Link to="/review-proposals" state={{ projectId: project.id }} className="text-accent-orange text-xs font-bold hover:underline">View Proposals</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {postedProjects.length === 0 && <div className="text-sm text-muted">You have not posted any jobs yet.</div>}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-xl mb-6">Active Contracts</h3>
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
                      <div className="flex justify-between items-start mb-4">
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
                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Escrow Status</p>
                          <p className="font-bold text-accent-cyan flex items-center gap-1"><ShieldCheck size={14} /> Locked ({formatTokenAmount(project.budget)} {project.tokenType})</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenMessage(project.freelancerAddress || 'Freelancer')} className="btn-outline py-2 px-4 text-xs flex items-center justify-center">Message</button>
                          {pendingReview ? (
                            <Link to="/review-work" state={{ projectId: project.id, submissionId: pendingReview.id }} className="btn-primary py-2 px-4 text-xs flex items-center justify-center">Review Work</Link>
                          ) : (
                            <button disabled className="btn-primary py-2 px-4 text-xs flex items-center justify-center opacity-50 cursor-not-allowed">No Submission Yet</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && <div className="text-sm text-muted">No active contracts yet.</div>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Shared.StatCard value={`${activeProjects.length}`} label="Active Contracts" color="bg-accent-orange" />
              <Shared.StatCard value={`${formatTokenAmount(activeEscrow)}`} label="Pending Escrow" color="bg-accent-cyan" />
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
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">Client: {formatAddress(project.clientAddress || '')}</p>
                        </div>
                        <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange rounded-full text-[10px] font-bold uppercase tracking-widest">{project.status}</span>
                      </div>

                      <div className="mb-6">
                        <h5 className="text-sm font-bold mb-3">Milestones</h5>
                        <div className="space-y-3">
                          {milestones.map((milestone) => (
                            <div key={milestone.milestoneNum} className={`flex items-center justify-between p-3 rounded-[10px] border border-border ${milestone.status === 'approved' ? 'bg-ink/5 opacity-60' : 'bg-ink/5'}`}>
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
                                ) : (
                                  <span className="text-xs text-muted mt-1 block capitalize">{milestone.status}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Escrow Status</p>
                          <p className="font-bold text-accent-cyan flex items-center gap-1"><ShieldCheck size={14} /> Funded ({formatTokenAmount(project.budget)} {project.tokenType})</p>
                        </div>
                        <button onClick={() => handleOpenMessage(project.clientAddress || 'Client')} className="btn-outline py-2 px-4 text-xs flex items-center justify-center">Message Client</button>
                      </div>
                    </div>
                  );
                })}
                {activeProjects.length === 0 && <div className="text-sm text-muted">No active contracts yet.</div>}
              </div>
            </div>
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
