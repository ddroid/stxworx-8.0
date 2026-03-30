import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronsRight, MoreHorizontal, Search, Star } from 'lucide-react';
import * as Shared from '../shared';
import { getConnections, getLeaderboard, getUserProfile, toApiAssetUrl, toDisplayName, toHandle, getUserProfilePath } from '../lib/api';
import type { ApiLeaderboardEntry } from '../types/leaderboard';
import type { ApiUserProfile } from '../types/user';

type FreelancerCard = ApiLeaderboardEntry & {
  profile: ApiUserProfile | null;
};

export const FreelancersPage = () => {
  const { walletAddress } = Shared.useWallet();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedRecipientAddress, setSelectedRecipientAddress] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [freelancers, setFreelancers] = useState<FreelancerCard[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<number>>(new Set());

  const handleOpenMessage = (recipient: string, recipientAddress: string) => {
    console.log('Opening message modal for:', recipient, recipientAddress);
    setSelectedRecipient(recipient);
    setSelectedRecipientAddress(recipientAddress);
    setIsMessageModalOpen(true);
  };

  useEffect(() => {
    const loadFreelancers = async () => {
      try {
        const entries = await getLeaderboard();
        const enriched = await Promise.all(
          entries.map(async (entry) => {
            try {
              const profile = await getUserProfile(entry.stxAddress);
              return { ...entry, profile };
            } catch {
              return { ...entry, profile: null };
            }
          }),
        );

        setFreelancers(enriched);
      } catch (error) {
        console.error('Failed to load freelancers data:', error);
      }
    };

    loadFreelancers();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadConnections = async () => {
      if (!walletAddress) {
        setConnectedUserIds(new Set());
        return;
      }

      try {
        const rows = await getConnections();
        if (!isMounted) {
          return;
        }

        setConnectedUserIds(
          new Set(
            rows
              .filter((connection) => connection.status === 'accepted' && typeof connection.otherUser?.id === 'number')
              .map((connection) => connection.otherUser!.id),
          ),
        );
      } catch (error) {
        console.error('Failed to load connections for freelancer filters:', error);
      }
    };

    loadConnections();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  const recentIds = useMemo(
    () =>
      new Set(
        [...freelancers]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, Math.min(6, freelancers.length))
          .map((freelancer) => freelancer.id),
      ),
    [freelancers],
  );

  const filters = useMemo(
    () => [
      { label: 'All', count: freelancers.filter((f) => f.stxAddress !== walletAddress && (!f.profile?.username || f.profile.username !== walletAddress)).length },
      { label: 'Connected Friends', count: freelancers.filter((freelancer) => connectedUserIds.has(freelancer.profile?.id ?? freelancer.id) && freelancer.stxAddress !== walletAddress).length },
      { label: 'Top Rated', count: freelancers.filter((freelancer) => freelancer.avgRating >= 4.5 && freelancer.stxAddress !== walletAddress && (!freelancer.profile?.username || freelancer.profile.username !== walletAddress)).length },
      { label: 'Most Reviewed', count: freelancers.filter((freelancer) => freelancer.reviewCount > 0 && freelancer.stxAddress !== walletAddress && (!freelancer.profile?.username || freelancer.profile.username !== walletAddress)).length },
      { label: 'Recently Joined', count: Array.from(recentIds).filter(id => {
        const freelancer = freelancers.find(f => f.id === id);
        return freelancer && freelancer.stxAddress !== walletAddress && (!freelancer.profile?.username || freelancer.profile.username !== walletAddress);
      }).length },
    ],
    [connectedUserIds, freelancers, recentIds, walletAddress],
  );

  const visibleFreelancers = useMemo(() => {
    const loweredSearch = searchQuery.trim().toLowerCase();

    return freelancers.filter((freelancer) => {
      // Exclude current user
      if (freelancer.stxAddress === walletAddress) return false;      
      const matchesFilter =
        selectedFilter === 'All' ||
        (selectedFilter === 'Connected Friends' && connectedUserIds.has(freelancer.profile?.id ?? freelancer.id)) ||
        (selectedFilter === 'Top Rated' && freelancer.avgRating >= 4.5) ||
        (selectedFilter === 'Most Reviewed' && freelancer.reviewCount > 0) ||
        (selectedFilter === 'Recently Joined' && recentIds.has(freelancer.id));

      const text = [
        toDisplayName(freelancer),
        toHandle(freelancer),
        freelancer.profile?.specialty,
        freelancer.profile?.company,
        freelancer.stxAddress,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = loweredSearch.length === 0 || text.includes(loweredSearch);

      return matchesFilter && matchesSearch;
    });
  }, [connectedUserIds, freelancers, recentIds, searchQuery, selectedFilter, walletAddress]);

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <Shared.MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientAddress={selectedRecipientAddress}
        />
        <div className="mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 md:mb-12">Freelancers</h1>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 mb-12">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedFilter(filter.label)}
                  className={`px-4 py-2 rounded-[15px] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${selectedFilter === filter.label ? 'bg-white text-bg' : 'bg-surface text-muted hover:text-ink'}`}
                >
                  {filter.label} <span className="opacity-40">{filter.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="bg-surface border border-border rounded-[15px] px-3 py-2 flex items-center gap-2 w-full sm:min-w-[220px]">
                <Search size={14} className="text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search freelancers"
                  className="bg-transparent text-sm text-ink placeholder:text-muted outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {visibleFreelancers.map((freelancer) => (
              <div key={freelancer.id} className="bg-surface rounded-[15px] p-6 md:p-8 border border-border group hover:border-accent-orange transition-all relative">
                <button className="absolute top-8 right-8 text-muted hover:text-ink">
                  <MoreHorizontal size={20} />
                </button>

                <div className="mb-6">
                  <span className="bg-accent-orange text-bg px-3 py-1 rounded-[15px] text-[8px] font-black uppercase tracking-widest mb-4 inline-block">
                    {(freelancer.profile?.specialty || 'Freelancer').toUpperCase()}
                  </span>
                  <Link to={getUserProfilePath(freelancer.profile || freelancer)} className="hover:text-accent-orange transition-colors">
                    <h3 className="text-3xl font-black tracking-tighter mb-1 leading-none">{toDisplayName(freelancer)}</h3>
                  </Link>
                  <Link to={getUserProfilePath(freelancer.profile || freelancer)} className="hover:text-accent-orange transition-colors">
                    <p className="text-sm font-bold text-accent-orange mb-2">{toHandle(freelancer)}</p>
                  </Link>
                  <p className="text-[10px] text-muted font-medium">{freelancer.stxAddress}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
                  <div className="relative">
                    {toApiAssetUrl(freelancer.profile?.avatar) ? (
                      <img
                        src={toApiAssetUrl(freelancer.profile?.avatar)}
                        alt={toDisplayName(freelancer)}
                        className="w-24 h-24 rounded-[10px] object-cover border-4 border-bg"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-[10px] bg-accent-pink/20 overflow-hidden border-4 border-bg flex items-center justify-center text-2xl font-black uppercase">
                        {toDisplayName(freelancer).slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xl font-black leading-none">{freelancer.profile?.hourlyRate || 'N/A'}</p>
                      <p className="text-[10px] text-muted font-bold">hourly rate</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black leading-none">{freelancer.avgRating.toFixed(1)}</p>
                      <Star size={14} className="text-accent-orange fill-accent-orange" />
                      <p className="text-[10px] text-muted font-bold">{freelancer.reviewCount} reviews</p>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleOpenMessage(toDisplayName(freelancer), freelancer.stxAddress)} className="w-full btn-outline py-4 rounded-[15px] text-xs font-bold hover:bg-white hover:text-ink transition-all">
                  Message
                </button>
              </div>
            ))}
            {visibleFreelancers.length === 0 && (
              <div className="bg-surface rounded-[15px] p-8 border border-border text-sm text-muted md:col-span-2 lg:col-span-3">
                No freelancers matched your current filters.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[10px] text-muted font-bold">Viewing {visibleFreelancers.length} of {freelancers.length} active members</p>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-[15px] bg-white text-bg flex items-center justify-center text-[10px] font-bold">1</button>
              <button className="w-8 h-8 rounded-[15px] bg-surface text-muted flex items-center justify-center text-[10px] font-bold hover:text-ink">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
