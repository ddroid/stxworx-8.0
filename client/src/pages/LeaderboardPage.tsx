import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, toDisplayName, toHandle } from '../lib/api';
import type { ApiLeaderboardEntry } from '../types/leaderboard';

export const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<ApiLeaderboardEntry[]>([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const entries = await getLeaderboard();
        setLeaders(entries);
      } catch (error) {
        console.error('Failed to load leaderboard data:', error);
      }
    };

    loadLeaderboard();
  }, []);

  const rankColors = ['bg-accent-orange', 'bg-accent-red', 'bg-accent-blue', 'bg-accent-cyan', 'bg-accent-lightblue', 'bg-accent-yellow'];

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <div className="mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 md:mb-12">Leaderboard</h1>
          
          <div className="grid grid-cols-1 gap-4">
            {leaders.map((leader, i) => (
              <div key={leader.id} className="bg-surface rounded-[15px] p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-accent-orange transition-all">
                <div className="flex items-center gap-4 sm:gap-8 min-w-0">
                  <div className="text-4xl font-black text-muted/20 w-12 text-center group-hover:text-accent-orange transition-colors">
                    {leader.rank}
                  </div>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-[10px] border-2 border-border bg-ink/5 flex items-center justify-center text-lg font-black uppercase">
                      {toDisplayName(leader).slice(0, 2)}
                    </div>
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-bg ${rankColors[i % rankColors.length]}`}>
                      {leader.rank === 1 ? '👑' : leader.rank}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter leading-none mb-1">{toDisplayName(leader)}</h3>
                    <p className="text-xs font-bold text-accent-orange">{toHandle(leader)}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 sm:gap-8 md:gap-12 w-full md:w-auto md:justify-end">
                  <div className="text-right">
                    <p className="text-2xl font-black leading-none">{leader.jobsCompleted}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Jobs Completed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black leading-none">{leader.avgRating.toFixed(1)}</p>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Rating</p>
                  </div>
                  <button onClick={() => navigate('/profile')} className="btn-outline py-3 px-6 rounded-[15px] text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-bg transition-all w-full sm:w-auto justify-center">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
            {leaders.length === 0 && (
              <div className="bg-surface rounded-[15px] p-6 border border-border text-sm text-muted">
                No leaderboard data is available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
