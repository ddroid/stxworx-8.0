import React, { useState } from 'react';
import { Search, Users, DollarSign, AlertCircle, CheckCircle, Clock, Ban, Gift, Link as LinkIcon } from 'lucide-react';
import {
  getAdminReferralsByUsername,
  formatAddress,
  formatRelativeTime,
  formatTokenAmount,
  type AdminReferralLookupResponse,
} from '../../lib/api';

export const ReferralViewer = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminReferralLookupResponse | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getAdminReferralsByUsername(username.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
        return <CheckCircle size={16} className="text-accent-cyan" />;
      case 'pending':
        return <Clock size={16} className="text-accent-orange" />;
      case 'blocked':
        return <Ban size={16} className="text-accent-red" />;
      default:
        return <AlertCircle size={16} className="text-muted" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20';
      case 'pending':
        return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
      case 'blocked':
        return 'bg-accent-red/10 text-accent-red border-accent-red/20';
      default:
        return 'bg-ink/5 text-muted border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <Gift size={18} />
          Referral Lookup
        </h3>
        
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username to lookup referrals..."
              className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange pl-11"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="btn-primary py-3 px-6 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-[15px] bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
            {error}
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Referrer Info */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">
                  {result.referrer.name || result.referrer.username || 'Unnamed User'}
                </h3>
                <p className="text-sm text-muted">@{result.referrer.username}</p>
                <p className="text-xs text-muted mt-1">{formatAddress(result.referrer.stxAddress)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${result.referrer.isActive ? 'bg-accent-cyan/10 text-accent-cyan' : 'bg-accent-red/10 text-accent-red'}`}>
                    {result.referrer.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-ink/10 text-muted">
                    {result.referrer.role}
                  </span>
                </div>
              </div>
              
              {result.code && (
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 bg-accent-orange/10 border border-accent-orange/20 rounded-[15px] px-4 py-3">
                    <LinkIcon size={16} className="text-accent-orange" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Referral Code</p>
                      <p className="text-lg font-black tracking-widest text-accent-orange">{result.code.code}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Created {result.code.createdAt ? formatRelativeTime(result.code.createdAt) : 'unknown'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-muted" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Total</span>
              </div>
              <p className="text-2xl font-black">{result.summary.totalReferrals}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-accent-cyan" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Qualified</span>
              </div>
              <p className="text-2xl font-black text-accent-cyan">{result.summary.qualifiedReferrals}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-accent-orange" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Pending</span>
              </div>
              <p className="text-2xl font-black text-accent-orange">{result.summary.pendingReferrals}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ban size={14} className="text-accent-red" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Blocked</span>
              </div>
              <p className="text-2xl font-black text-accent-red">{result.summary.blockedReferrals}</p>
            </div>
          </div>

          {/* Payout Summary */}
          <div className="card">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <DollarSign size={16} />
              Payout Summary
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-ink/5 rounded-[15px] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Total</p>
                <p className="text-xl font-black">${formatTokenAmount(result.summary.totalPayoutUsd)}</p>
              </div>
              <div className="bg-ink/5 rounded-[15px] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Pending</p>
                <p className="text-xl font-black text-accent-orange">${formatTokenAmount(result.summary.pendingPayoutUsd)}</p>
              </div>
              <div className="bg-ink/5 rounded-[15px] p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Paid</p>
                <p className="text-xl font-black text-accent-cyan">${formatTokenAmount(result.summary.paidPayoutUsd)}</p>
              </div>
            </div>
          </div>

          {/* Referrals List */}
          <div className="card">
            <h4 className="font-bold mb-4">Referred Clients ({result.referrals.length})</h4>
            
            {result.referrals.length === 0 ? (
              <p className="text-sm text-muted">No referrals found for this user.</p>
            ) : (
              <div className="space-y-4">
                {result.referrals.map((referral) => (
                  <div key={referral.id} className="border border-border rounded-[15px] p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(referral.status)}
                        <div>
                          <p className="font-bold">
                            {referral.referredUser?.name || referral.referredUser?.username || 'Unknown User'}
                          </p>
                          {referral.referredUser && (
                            <p className="text-xs text-muted">
                              @{referral.referredUser.username} • {formatAddress(referral.referredUser.stxAddress)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${getStatusClass(referral.status)}`}>
                        {referral.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">First Seen</p>
                        <p>{formatRelativeTime(referral.firstSeenAt)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Became Client</p>
                        <p>{referral.becameClientAt ? formatRelativeTime(referral.becameClientAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Qualified At</p>
                        <p>{referral.qualifiedAt ? formatRelativeTime(referral.qualifiedAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Completed Jobs</p>
                        <p className="font-bold">{referral.totalCompletedJobs}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">First Project</p>
                        <p className="font-mono">#{referral.firstProjectId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">First Escrow</p>
                        <p className="font-mono">#{referral.firstEscrowProjectId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Qualified Project</p>
                        <p className="font-mono">#{referral.qualifiedProjectId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Total Spend</p>
                        <p className="font-bold">${formatTokenAmount(referral.cumulativeCompletedSpendUsd)}</p>
                      </div>
                    </div>

                    {referral.qualificationRule && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Qualification Rule</p>
                        <p className="text-sm">{referral.qualificationRule.replace(/_/g, ' ')}</p>
                      </div>
                    )}

                    {referral.blockedReason && (
                      <div className="mb-4 p-3 rounded-[10px] bg-accent-red/10 border border-accent-red/20">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-red mb-1">Blocked Reason</p>
                        <p className="text-sm text-accent-red">{referral.blockedReason}</p>
                      </div>
                    )}

                    {/* Attribution Details */}
                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Attribution Details</p>
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted">
                        <div>
                          <p>IP: {referral.firstSeenIp || '—'}</p>
                          <p>User Agent: {referral.userAgent ? referral.userAgent.substring(0, 50) + '...' : '—'}</p>
                        </div>
                        <div>
                          <p>Attribution ID: #{referral.id}</p>
                          <p>Created: {formatRelativeTime(referral.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payouts */}
                    {referral.payouts.length > 0 && (
                      <div className="border-t border-border pt-4 mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Payouts</p>
                        <div className="space-y-2">
                          {referral.payouts.map((payout) => (
                            <div key={payout.id} className="flex items-center justify-between bg-ink/5 rounded-[10px] p-3">
                              <div>
                                <p className="font-bold">${formatTokenAmount(payout.amountUsd)}</p>
                                <p className="text-xs text-muted">
                                  {payout.eligibleSpendUsd} @ {payout.payoutRate}% • Project #{payout.projectId || '—'}
                                </p>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                                payout.status === 'paid' ? 'bg-accent-cyan/10 text-accent-cyan' : 
                                payout.status === 'pending' ? 'bg-accent-orange/10 text-accent-orange' : 
                                'bg-accent-red/10 text-accent-red'
                              }`}>
                                {payout.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
