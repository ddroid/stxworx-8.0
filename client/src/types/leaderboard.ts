export interface ApiLeaderboardEntry {
  id: number;
  stxAddress: string;
  name?: string | null;
  username?: string | null;
  jobsCompleted: number;
  avgRating: number;
  reviewCount: number;
  createdAt?: string;
  rank: number;
}
