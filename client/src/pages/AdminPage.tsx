import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, ShieldCheck, Users, Wallet, Gift } from 'lucide-react';
import * as Shared from '../shared';
import {
  adminLogin,
  adminLogout,
  executeAdminProjectRefund,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  getAdminDashboard,
  getAdminDisputes,
  getAdminMe,
  getAdminPlatformConfig,
  getAdminRefundQueue,
  getAdminUsers,
  toDisplayName,
  resolveAdminDispute,
  resetAdminDispute,
  updateAdminPlatformConfig,
  updateAdminUserStatus,
  type ApiAdmin,
  type ApiAdminDashboard,
  type AdminRefundQueueItem,
  type ApiDispute,
  type ApiPlatformConfig,
} from '../lib/api';
import { adminEscrowRefund } from '../lib/escrow';
import type { ApiUserProfile } from '../types/user';
import { ReferralViewer } from './admin';

type ResolutionDraft = {
  favorFreelancer: boolean;
  resolution: string;
  resolutionTxId: string;
};

type RefundDraft = {
  note: string;
  txId: string;
};

export const AdminDashboard = () => {
  const { walletAddress } = Shared.useWallet();
  const [admin, setAdmin] = useState<ApiAdmin | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState<ApiAdminDashboard | null>(null);
  const [users, setUsers] = useState<ApiUserProfile[]>([]);
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [refundQueue, setRefundQueue] = useState<AdminRefundQueueItem[]>([]);
  const [platformConfig, setPlatformConfig] = useState<ApiPlatformConfig | null>(null);
  const [daoFeePercentage, setDaoFeePercentage] = useState('');
  const [daoWalletAddress, setDaoWalletAddress] = useState('');
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<number, ResolutionDraft>>({});
  const [refundDrafts, setRefundDrafts] = useState<Record<number, RefundDraft>>({});
  const [processingRefundProjectId, setProcessingRefundProjectId] = useState<number | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ admin: currentAdmin }, dashboardResponse, userResponse, disputeResponse, configResponse, refundQueueResponse] = await Promise.all([
        getAdminMe(),
        getAdminDashboard(),
        getAdminUsers(),
        getAdminDisputes(),
        getAdminPlatformConfig(),
        getAdminRefundQueue(),
      ]);

      setAdmin(currentAdmin);
      setDashboard(dashboardResponse);
      setUsers(userResponse);
      setDisputes(disputeResponse);
      setRefundQueue(refundQueueResponse);
      setPlatformConfig(configResponse);
      setDaoFeePercentage(configResponse.daoFeePercentage || '');
      setDaoWalletAddress(configResponse.daoWalletAddress || '');
      setResolutionDrafts(
        Object.fromEntries(
          disputeResponse.map((dispute) => [
            dispute.id,
            { favorFreelancer: true, resolution: '', resolutionTxId: '' },
          ]),
        ),
      );
      setRefundDrafts(
        Object.fromEntries(
          refundQueueResponse.map((refund) => [
            refund.projectId,
            { note: refund.note || '', txId: refund.txId || '' },
          ]),
        ),
      );
      setLoginError('');
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const activeDisputes = useMemo(
    () => disputes.filter((dispute) => dispute.status === 'open'),
    [disputes],
  );

  const pendingRefundQueue = useMemo(
    () => refundQueue.filter((refund) => refund.status === 'requested' && refund.project),
    [refundQueue],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await adminLogin({ username, password });
      setAdmin(response.admin);
      setPassword('');
      await loadAdminData();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch (error) {
      console.error('Admin logout failed:', error);
    } finally {
      setAdmin(null);
    }
  };

  const handleToggleUser = async (user: ApiUserProfile) => {
    try {
      const updated = await updateAdminUserStatus(user.id, !user.isActive);
      setUsers((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const updateResolutionDraft = (disputeId: number, patch: Partial<ResolutionDraft>) => {
    setResolutionDrafts((current) => ({
      ...current,
      [disputeId]: {
        ...current[disputeId],
        favorFreelancer: current[disputeId]?.favorFreelancer ?? true,
        resolution: current[disputeId]?.resolution ?? '',
        resolutionTxId: current[disputeId]?.resolutionTxId ?? '',
        ...patch,
      },
    }));
  };

  const handleResolveDispute = async (disputeId: number, mode: 'resolve' | 'reset') => {
    const draft = resolutionDrafts[disputeId];
    if (!draft?.resolution.trim() || !draft?.resolutionTxId.trim()) {
      return;
    }

    try {
      const updated = mode === 'resolve'
        ? await resolveAdminDispute(disputeId, {
            resolution: draft.resolution.trim(),
            resolutionTxId: draft.resolutionTxId.trim(),
            favorFreelancer: draft.favorFreelancer,
          })
        : await resetAdminDispute(disputeId, {
            resolution: draft.resolution.trim(),
            resolutionTxId: draft.resolutionTxId.trim(),
            favorFreelancer: draft.favorFreelancer,
          });

      setDisputes((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (error) {
      console.error('Failed to update dispute:', error);
    }
  };

  const handleSavePlatformConfig = async () => {
    try {
      const updated = await updateAdminPlatformConfig({
        daoFeePercentage: daoFeePercentage.trim(),
        daoWalletAddress: daoWalletAddress.trim(),
      });
      setPlatformConfig(updated);
      setDaoFeePercentage(updated.daoFeePercentage || '');
      setDaoWalletAddress(updated.daoWalletAddress || '');
    } catch (error) {
      console.error('Failed to update platform config:', error);
    }
  };

  const updateRefundDraft = (projectId: number, patch: Partial<RefundDraft>) => {
    setRefundDrafts((current) => ({
      ...current,
      [projectId]: {
        note: current[projectId]?.note ?? '',
        txId: current[projectId]?.txId ?? '',
        ...patch,
      },
    }));
  };

  const handleAdminRefund = async (refundItem: AdminRefundQueueItem) => {
    if (!refundItem.project?.onChainId || processingRefundProjectId) {
      return;
    }

    const configuredAdminPrincipal = refundItem.configuredAdminPrincipal?.trim().toUpperCase() || '';
    const connectedWallet = walletAddress?.trim().toUpperCase() || '';
    if (!configuredAdminPrincipal || !connectedWallet || configuredAdminPrincipal !== connectedWallet) {
      return;
    }

    setProcessingRefundProjectId(refundItem.projectId);
    try {
      const txId = await adminEscrowRefund(refundItem.project.onChainId, refundItem.project.tokenType);
      await executeAdminProjectRefund(refundItem.projectId, {
        txId,
        note: refundDrafts[refundItem.projectId]?.note?.trim() || undefined,
      });
      await loadAdminData();
    } catch (error) {
      console.error('Failed to execute admin refund:', error);
    } finally {
      setProcessingRefundProjectId(null);
    }
  };

  const statCards = dashboard
    ? [
        { label: 'Total Users', value: String(dashboard.totalUsers) },
        { label: 'Total Projects', value: String(dashboard.totalProjects) },
        { label: 'Active Projects', value: String(dashboard.activeProjects) },
        { label: 'Open Disputes', value: String(dashboard.openDisputes) },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="card p-8 text-sm text-muted">Loading admin portal...</div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-12 flex flex-col items-center">
            <Shared.Logo className="text-5xl mb-6" />
            <h1 className="text-4xl font-black tracking-tighter mb-2">Admin Portal</h1>
            <p className="text-muted">Secure access for STXWORX administrators</p>
          </div>

          <div className="card p-8">
            <form className="space-y-6" onSubmit={handleLogin}>
              {loginError && <p className="text-xs text-accent-red text-center font-bold">{loginError}</p>}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange"
                  placeholder="admin_user"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-4 font-bold disabled:opacity-50">
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">Admin Dashboard</h1>
            <p className="text-muted">Welcome back, {admin.username}.</p>
          </div>
          <button onClick={handleLogout} className="btn-outline flex items-center gap-2">
            <LogOut size={18} /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat) => (
            <div key={stat.label} className="card p-6">
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4">{stat.label}</p>
              <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold">Platform Overview</h3>
              <button onClick={loadAdminData} className="text-xs text-accent-orange font-bold">Refresh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-ink/5 rounded-[15px] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Completed Projects</p>
                <p className="text-2xl font-black">{dashboard?.completedProjects ?? 0}</p>
              </div>
              <div className="bg-ink/5 rounded-[15px] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Funded Projects</p>
                <p className="text-2xl font-black">{dashboard?.fundedProjects ?? 0}</p>
              </div>
              <div className="bg-ink/5 rounded-[15px] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Pending Submissions</p>
                <p className="text-2xl font-black">{dashboard?.pendingSubmissions ?? 0}</p>
              </div>
              <div className="bg-ink/5 rounded-[15px] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Freelancers / Clients</p>
                <p className="text-2xl font-black">{dashboard?.freelancerCount ?? 0} / {dashboard?.clientCount ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <Users size={18} />
              User Access Control
            </h3>
            <div className="space-y-3 max-h-[340px] overflow-y-auto no-scrollbar">
              {users.map((user) => (
                <div key={user.id} className="bg-ink/5 rounded-[15px] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">{toDisplayName(user)}</p>
                      <p className="text-[10px] text-muted uppercase tracking-widest">{user.role}</p>
                    </div>
                    <button
                      onClick={() => handleToggleUser(user)}
                      className={`text-xs font-bold ${user.isActive ? 'text-accent-red' : 'text-accent-cyan'}`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted mt-2">{formatAddress(user.stxAddress)}</p>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-muted">No users found.</p>}
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold">DAO Configuration</h3>
            <span className="text-xs text-muted bg-ink/5 px-3 py-1 rounded-full font-bold">Live config</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted">DAO Fee Percentage</label>
              <input
                value={daoFeePercentage}
                onChange={(event) => setDaoFeePercentage(event.target.value)}
                className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none"
                placeholder="10.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted">DAO Wallet Address</label>
              <input
                value={daoWalletAddress}
                onChange={(event) => setDaoWalletAddress(event.target.value)}
                className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none"
                placeholder="SP..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-muted">
              Last updated {platformConfig?.updatedAt ? formatRelativeTime(platformConfig.updatedAt) : 'just now'}
            </p>
            <button onClick={handleSavePlatformConfig} className="btn-primary py-3 px-5 text-xs">
              Save DAO Config
            </button>
          </div>
        </div>

        <div className="card mb-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold flex items-center gap-2"><Wallet size={18} /> Refund Fallback Queue</h3>
            <span className="text-xs text-muted bg-ink/5 px-3 py-1 rounded-full font-bold">{pendingRefundQueue.length} Pending</span>
          </div>
          <div className="space-y-6">
            {pendingRefundQueue.map((refund) => {
              const project = refund.project;
              if (!project) {
                return null;
              }

              const draft = refundDrafts[refund.projectId] || { note: '', txId: refund.txId || '' };
              const configuredAdminPrincipal = refund.configuredAdminPrincipal?.trim().toUpperCase() || '';
              const connectedWallet = walletAddress?.trim().toUpperCase() || '';
              const walletMatches = Boolean(configuredAdminPrincipal && connectedWallet && configuredAdminPrincipal === connectedWallet);
              const isProcessing = processingRefundProjectId === refund.projectId;

              return (
                <div key={refund.id} className="border border-border rounded-[15px] p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                    <div>
                      <p className="font-black text-lg">{project.title}</p>
                      <p className="text-xs text-muted">Project #{project.id} • Requested {refund.requestedAt ? formatRelativeTime(refund.requestedAt) : 'recently'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent-orange/10 text-accent-orange">
                      {refund.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Client</p>
                        <p className="text-sm font-bold">{formatAddress(project.clientAddress || '')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Remaining Escrow</p>
                        <p className="text-sm font-bold">{formatTokenAmount(refund.refundSummary?.remainingAmount || 0)} {project.tokenType}</p>
                      </div>
                      {refund.reason && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Reason</p>
                          <p className="text-sm text-muted">{refund.reason}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Configured Refund Admin</p>
                        <p className="text-xs break-all text-muted">{refund.configuredAdminPrincipal || 'Not configured'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Connected Wallet</p>
                        <p className={`text-xs break-all ${walletMatches ? 'text-accent-cyan' : 'text-accent-red'}`}>{walletAddress || 'No wallet connected'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={draft.note}
                        onChange={(e) => updateRefundDraft(refund.projectId, { note: e.target.value })}
                        className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm min-h-[110px] outline-none"
                        placeholder="Admin refund note"
                      />
                      <input
                        value={draft.txId}
                        onChange={(e) => updateRefundDraft(refund.projectId, { txId: e.target.value })}
                        disabled
                        className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none disabled:opacity-50"
                        placeholder="Refund transaction ID will populate after wallet confirmation"
                      />
                      <button
                        onClick={() => handleAdminRefund(refund)}
                        disabled={!walletMatches || !project.onChainId || isProcessing}
                        className="btn-primary py-3 px-4 text-xs disabled:opacity-50"
                      >
                        {isProcessing ? 'Opening Wallet...' : 'Execute Admin Refund'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingRefundQueue.length === 0 && <p className="text-sm text-muted">No refund fallback actions are pending.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold">Escrow Dispute Resolution</h3>
            <span className="text-xs text-muted bg-ink/5 px-3 py-1 rounded-full font-bold">{activeDisputes.length} Active Disputes</span>
          </div>
          <div className="space-y-6">
            {disputes.map((dispute) => {
              const draft = resolutionDrafts[dispute.id] || { favorFreelancer: true, resolution: '', resolutionTxId: '' };
              return (
                <div key={dispute.id} className="border border-border rounded-[15px] p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                    <div>
                      <p className="font-black text-lg">Dispute #{dispute.id}</p>
                      <p className="text-xs text-muted">Project #{dispute.projectId} • Milestone {dispute.milestoneNum} • {formatRelativeTime(dispute.createdAt)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${dispute.status === 'open' ? 'bg-accent-orange/10 text-accent-orange' : 'bg-accent-cyan/10 text-accent-cyan'}`}>
                      {dispute.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Reason</p>
                        <p className="text-sm">{dispute.reason}</p>
                      </div>
                      {dispute.evidenceUrl && (
                        <a href={dispute.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-cyan hover:underline">
                          Evidence Link
                        </a>
                      )}
                      {dispute.resolution && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Resolution</p>
                          <p className="text-sm text-muted">{dispute.resolution}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={draft.resolution}
                        onChange={(e) => updateResolutionDraft(dispute.id, { resolution: e.target.value })}
                        disabled={dispute.status !== 'open'}
                        className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm min-h-[110px] outline-none disabled:opacity-50"
                        placeholder="Enter admin resolution notes"
                      />
                      <input
                        value={draft.resolutionTxId}
                        onChange={(e) => updateResolutionDraft(dispute.id, { resolutionTxId: e.target.value })}
                        disabled={dispute.status !== 'open'}
                        className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none disabled:opacity-50"
                        placeholder="Resolution transaction ID"
                      />
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => updateResolutionDraft(dispute.id, { favorFreelancer: false })}
                          disabled={dispute.status !== 'open'}
                          className={`px-4 py-2 rounded-[15px] text-xs font-bold border ${!draft.favorFreelancer ? 'bg-accent-red text-white border-transparent' : 'border-border text-muted'} disabled:opacity-50`}
                        >
                          Favor Client
                        </button>
                        <button
                          onClick={() => updateResolutionDraft(dispute.id, { favorFreelancer: true })}
                          disabled={dispute.status !== 'open'}
                          className={`px-4 py-2 rounded-[15px] text-xs font-bold border ${draft.favorFreelancer ? 'bg-accent-cyan text-white border-transparent' : 'border-border text-muted'} disabled:opacity-50`}
                        >
                          Favor Freelancer
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleResolveDispute(dispute.id, 'resolve')}
                          disabled={dispute.status !== 'open'}
                          className="btn-primary py-3 px-4 text-xs disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleResolveDispute(dispute.id, 'reset')}
                          disabled={dispute.status !== 'open'}
                          className="btn-outline py-3 px-4 text-xs disabled:opacity-50"
                        >
                          Reset Milestone
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {disputes.length === 0 && <p className="text-sm text-muted">No disputes found.</p>}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold flex items-center gap-2"><Gift size={18} /> Referral Management</h3>
          </div>
          <ReferralViewer />
        </div>
      </div>
    </div>
  );
};
