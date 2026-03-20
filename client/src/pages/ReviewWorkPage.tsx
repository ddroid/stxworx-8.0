import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  approveMilestone,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getMyActiveProjects,
  getProject,
  getProjectMilestones,
  rejectMilestone,
  toAppJob,
  type ApiMilestoneSubmission,
} from '../lib/api';
import { releaseEscrowMilestone } from '../lib/escrow';
import type { ApiProject } from '../types/job';

export const ReviewWorkPage = () => {
  const location = useLocation();
  const state = (location.state as { projectId?: number; submissionId?: number } | null) || null;
  const [project, setProject] = useState<ApiProject | null>(null);
  const [submissions, setSubmissions] = useState<ApiMilestoneSubmission[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    try {
      const activeProjects = await getMyActiveProjects();
      const resolvedProjectId = state?.projectId || activeProjects[0]?.id;
      if (!resolvedProjectId) {
        setProject(null);
        setSubmissions([]);
        return;
      }

      const [resolvedProject, milestoneSubmissions] = await Promise.all([
        getProject(resolvedProjectId),
        getProjectMilestones(resolvedProjectId),
      ]);

      setProject(resolvedProject);
      setSubmissions(milestoneSubmissions);
    } catch (error) {
      console.error('Failed to load submitted work:', error);
    } finally {
      setLoading(false);
    }
  }, [state?.projectId]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const selectedSubmission = useMemo(() => {
    if (submissions.length === 0) {
      return null;
    }

    return (
      submissions.find((submission) => submission.id === state?.submissionId) ||
      submissions.find((submission) => submission.status === 'submitted') ||
      submissions[0]
    );
  }, [state?.submissionId, submissions]);

  const milestoneTitle = useMemo(() => {
    if (!project || !selectedSubmission) {
      return '';
    }

    const milestone = toAppJob(project).milestones[selectedSubmission.milestoneNum - 1];
    return milestone?.title || `Milestone ${selectedSubmission.milestoneNum}`;
  }, [project, selectedSubmission]);

  const milestoneAmount = useMemo(() => {
    if (!project || !selectedSubmission) {
      return '';
    }

    const milestone = toAppJob(project).milestones[selectedSubmission.milestoneNum - 1];
    return `${formatTokenAmount(milestone?.amount)} ${project.tokenType}`;
  }, [project, selectedSubmission]);

  const handleApprove = async () => {
    if (!selectedSubmission || !project?.onChainId) {
      return;
    }

    setIsApproving(true);
    try {
      const releaseTxId = await releaseEscrowMilestone(project.onChainId, selectedSubmission.milestoneNum, project.tokenType);
      await approveMilestone(selectedSubmission.id, { releaseTxId });
      await loadSubmission();
    } catch (error) {
      console.error('Failed to approve milestone:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) {
      return;
    }

    try {
      await rejectMilestone(selectedSubmission.id);
      await loadSubmission();
    } catch (error) {
      console.error('Failed to reject milestone:', error);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-ink mb-8 transition-colors">
          <ChevronRight size={14} className="rotate-180" /> Back to Dashboard
        </Link>
        <h1 className="text-5xl font-black tracking-tighter mb-2">Review Work</h1>
        <p className="text-muted mb-12">
          {project ? `Review submitted work for "${project.title}"` : 'Review submitted milestone work.'}
        </p>

        {loading ? (
          <div className="card p-8 text-sm text-muted">Loading submitted work...</div>
        ) : !project || !selectedSubmission ? (
          <div className="card p-8 text-sm text-muted">No milestone submissions are ready for review yet.</div>
        ) : (
          <div className="card p-8">
            <div className="flex justify-between items-start mb-8 pb-8 border-b border-border">
              <div>
                <h3 className="font-bold text-2xl mb-2">Milestone {selectedSubmission.milestoneNum}: {milestoneTitle}</h3>
                <p className="text-sm text-muted">Submitted by {formatAddress(project.freelancerAddress || '')} • {formatRelativeTime(selectedSubmission.submittedAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-2xl text-accent-cyan">{milestoneAmount}</p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Escrow Amount</p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="font-bold mb-4">Freelancer Notes</h4>
              <div className="bg-ink/5 rounded-[15px] p-6">
                <p className="text-sm text-muted leading-relaxed">{selectedSubmission.description || 'No description provided.'}</p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="font-bold mb-4">Attachments</h4>
              <a
                href={selectedSubmission.deliverableUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-border rounded-[15px] p-4 flex items-center gap-4 hover:bg-ink/5 transition-colors"
              >
                <div className="w-10 h-10 bg-accent-orange/20 text-accent-orange rounded-lg flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm truncate">{selectedSubmission.deliverableUrl}</p>
                  <p className="text-xs text-muted capitalize">{selectedSubmission.status}</p>
                </div>
                <Download size={16} className="text-muted ml-4" />
              </a>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={selectedSubmission.status !== 'submitted' || !project.onChainId || isApproving}
                className="flex-1 btn-primary py-4 justify-center disabled:opacity-50"
              >
                {isApproving ? 'Opening Wallet...' : selectedSubmission.status === 'approved' ? 'Funds Released' : 'Approve & Release Funds'}
              </button>
              <button
                onClick={handleReject}
                disabled={selectedSubmission.status !== 'submitted' || isApproving}
                className="flex-1 btn-outline py-4 justify-center disabled:opacity-50"
              >
                {selectedSubmission.status === 'rejected' ? 'Changes Requested' : 'Request Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
