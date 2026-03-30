export type PlatformMenuItem = {
  id: string;
  label: string;
  path: string;
  shortLabel?: string;
  keywords: string[];
  iconKey:
    | 'home'
    | 'dashboard'
    | 'jobs'
    | 'freelancers'
    | 'bounties'
    | 'leaderboard'
    | 'ai-proposal'
    | 'posts'
    | 'messages'
    | 'notifications'
    | 'profile'
    | 'settings';
};

export const platformMenuItems: PlatformMenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    shortLabel: 'Home',
    keywords: ['landing', 'overview', 'main'],
    iconKey: 'home',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    shortLabel: 'Dash',
    keywords: ['workspace', 'client', 'freelancer', 'projects'],
    iconKey: 'dashboard',
  },
  {
    id: 'jobs',
    label: 'Explore Jobs',
    path: '/jobs',
    shortLabel: 'Jobs',
    keywords: ['projects', 'gigs', 'work', 'marketplace'],
    iconKey: 'jobs',
  },
  {
    id: 'freelancers',
    label: 'Freelancers',
    path: '/freelancers',
    shortLabel: 'Talent',
    keywords: ['creators', 'profiles', 'people', 'users'],
    iconKey: 'freelancers',
  },
  {
    id: 'bounties',
    label: 'Bounty Board',
    path: '/bounties',
    shortLabel: 'Bounty',
    keywords: ['rewards', 'tasks', 'board', 'contests'],
    iconKey: 'bounties',
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    path: '/leaderboard',
    shortLabel: 'Ranks',
    keywords: ['rankings', 'top users', 'stats'],
    iconKey: 'leaderboard',
  },
  {
    id: 'ai-proposal',
    label: 'AI Proposal Writer',
    path: '/ai-proposal',
    shortLabel: 'AI',
    keywords: ['proposal', 'assistant', 'generator', 'writer'],
    iconKey: 'ai-proposal',
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/messages',
    shortLabel: 'Inbox',
    keywords: ['chat', 'dm', 'conversations', 'inbox'],
    iconKey: 'messages',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    shortLabel: 'Alerts',
    keywords: ['updates', 'activity', 'alerts', 'events'],
    iconKey: 'notifications',
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    shortLabel: 'Profile',
    keywords: ['account', 'user', 'portfolio'],
    iconKey: 'profile',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    shortLabel: 'Settings',
    keywords: ['preferences', 'configuration', 'privacy'],
    iconKey: 'settings',
  },
  {
    id: 'posts',
    label: 'Posts',
    path: '/posts',
    shortLabel: 'Posts',
    keywords: ['social', 'timeline', 'community', 'feed'],
    iconKey: 'posts',
  },
];
