import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Home,
  LayoutGrid,
  Mail,
  MessageCircle,
  Moon,
  PenTool,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Trophy,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as Shared from '../../shared';
import {
  getConversations,
  formatRelativeTime,
  getNotifications,
  getUnreadMessageCount,
  getUnreadNotificationCount,
  getUserProfile,
  markNotificationRead,
  toDisplayName,
  type ApiConversation,
  type ApiNotification,
} from '../../lib/api';
import type { ApiUserProfile } from '../../types/user';
import { platformMenuItems, type PlatformMenuItem } from './navigation';

function getNotificationMeta(type: ApiNotification['type']) {
  switch (type) {
    case 'proposal_received':
      return { icon: Briefcase, color: 'bg-accent-orange' };
    case 'proposal_accepted':
      return { icon: CheckCircle2, color: 'bg-accent-blue' };
    case 'milestone_submitted':
      return { icon: Bell, color: 'bg-accent-red' };
    case 'milestone_approved':
      return { icon: ShoppingBag, color: 'bg-accent-cyan' };
    case 'milestone_rejected':
    case 'dispute_filed':
    case 'dispute_resolved':
      return { icon: AlertTriangle, color: 'bg-accent-red' };
    case 'project_completed':
      return { icon: CheckCircle2, color: 'bg-accent-cyan' };
    default:
      return { icon: Bell, color: 'bg-ink/20' };
  }
}

const menuIconMap: Record<PlatformMenuItem['iconKey'], LucideIcon> = {
  home: Home,
  dashboard: LayoutGrid,
  jobs: Briefcase,
  freelancers: Users,
  bounties: Trophy,
  leaderboard: Star,
  'ai-proposal': Sparkles,
  pro: ShieldCheck,
  messages: MessageCircle,
  notifications: Bell,
  profile: User,
  settings: Settings,
};

function scoreMenuItem(item: PlatformMenuItem, terms: string[]) {
  const label = item.label.toLowerCase();
  const shortLabel = (item.shortLabel || '').toLowerCase();
  const path = item.path.toLowerCase();
  const keywords = item.keywords.map((keyword) => keyword.toLowerCase());
  const compactLabel = label.replace(/\s+/g, '');
  const joinedTerms = terms.join('');
  let score = 0;

  for (const term of terms) {
    if (label === term) score += 120;
    if (label.startsWith(term)) score += 70;
    if (label.includes(term)) score += 45;
    if (shortLabel.startsWith(term)) score += 35;
    if (path.includes(term)) score += 20;
    if (keywords.some((keyword) => keyword === term)) score += 30;
    if (keywords.some((keyword) => keyword.includes(term))) score += 15;
  }

  if (joinedTerms && compactLabel.startsWith(joinedTerms)) {
    score += 30;
  }

  return score;
}

const announcementSlides = [
  {
    text: (
      <>
        We're currently in <span className="font-black text-accent-orange">Beta!</span> Official launch planned for{' '}
        <span className="font-black">April 2nd.</span> Currently addressing{' '}
        <span className="font-black text-accent-orange">X402</span> &{' '}
        <span className="font-black text-accent-blue">AI integration</span> QA/QC.
      </>
    ),
  },
  {
    text: (
      <>
        For <span className="font-black">collaborations</span>, <span className="font-black">ambassador roles</span>, or{' '}
        <span className="font-black">media partnerships</span> —{' '}
        <span className="inline-flex items-center gap-1.5 bg-accent-orange text-bg px-3 py-1 rounded-[25px] text-[11px] font-black uppercase tracking-widest" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 100%)', boxShadow: '0 2px 0 var(--btn-shadow-color, #CC5500)' }}>
          <Mail size={12} /> Contact now
        </span>
      </>
    ),
  },
];

const AnnouncementBar = ({ navigate }: { navigate: (path: string) => void }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % announcementSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleContactClick = () => {
    navigate('/contact');
  };

  return (
    <div className={`fixed top-0 left-0 right-0 h-12 z-50 border-b border-border flex items-center justify-center overflow-hidden ${
      current === 0 
        ? 'bg-gradient-to-r from-accent-orange via-accent-yellow to-accent-orange/80' 
        : 'bg-gradient-to-r from-accent-blue via-accent-lightblue to-accent-blue/80'
    }`}>
      <div className="absolute left-3 md:left-24 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-bg animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-bg md:hidden bg-accent-orange/20 px-1.5 py-0.5 rounded-[8px]">Testnet</span>
        <span className="text-xs font-black uppercase tracking-widest text-bg hidden md:inline bg-accent-orange/20 px-2 py-0.5 rounded-[10px]">Testnet</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-[10px] sm:text-xs lg:text-sm font-black uppercase tracking-widest text-bg text-center px-10 sm:px-12 lg:px-14"
        >
          {current === 1 ? (
            <>
              <span className="sm:hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center gap-2" onClick={handleContactClick}>
                FOR COLLAB OR MEDIA PARTNERSHIPS — CONTACT NOW
                <ArrowRight size={12} className="flex-shrink-0" />
              </span>
              <span className="hidden sm:inline">FOR COLLABORATIONS, AMBASSADOR ROLES, OR MEDIA PARTNERSHIPS —{' '}
              <span onClick={handleContactClick} className="inline-flex items-center gap-1.5 bg-accent-orange text-bg px-3 py-1 rounded-[25px] text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-ink transition-all duration-300" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 100%)', boxShadow: '0 2px 0 var(--btn-shadow-color, #CC5500)' }}>
                <Mail size={12} /> CONTACT NOW
              </span></span>
            </>
          ) : (
            <>
              <span className="sm:hidden">WE'RE CURRENTLY IN BETA! OFFICIAL LAUNCH PLANNED FOR APRIL 2ND</span>
              <span className="hidden sm:inline">WE'RE CURRENTLY IN BETA! OFFICIAL LAUNCH PLANNED FOR APRIL 2ND. STAY TUNED FOR EXCITING UPDATES.
              CURRENTLY ADDRESSING X402 & AI INTEGRATION QA/QC.</span>
            </>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export const TopHeader = ({ theme, toggleTheme }: { theme: 'dark' | 'light', toggleTheme: () => void }) => {
  const navigate = useNavigate();
  const { walletAddress, userRole, setUserRole, blockedWallets, connect, disconnect, isSignedIn, needsRoleSelection, completeRoleSelection } = Shared.useWallet();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [recentMessages, setRecentMessages] = useState<ApiConversation[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);

  const isBlocked = walletAddress && blockedWallets.includes(walletAddress);

  useEffect(() => {
    if (needsRoleSelection && !showLogoutConfirm && !isBlocked) {
      setShowRoleModal(true);
    } else {
      setShowRoleModal(false);
    }
  }, [needsRoleSelection, showLogoutConfirm, isBlocked]);

  const displayWalletAddress = useMemo(() => {
    if (!walletAddress) return 'Connect Wallet';
    if (walletAddress.length <= 10) return walletAddress;
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  }, [walletAddress]);

  const displayName = useMemo(() => {
    if (profile) {
      return toDisplayName(profile);
    }

    if (walletAddress) {
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }

    return 'Guest';
  }, [profile, walletAddress]);

  const handleConnect = async () => {
    // Just connect wallet without role for login
    connect();
    setShowRoleModal(false);
    setShowLogoutConfirm(false);
    setSelectedProvider(null);
  };

  const handleRoleSelection = async (role: 'client' | 'freelancer') => {
    setShowRoleModal(false);
    setShowLogoutConfirm(false);
    setSelectedProvider(null);
    
    try {
      await completeRoleSelection(role);
    } catch (error) {
      console.error('Error completing role selection:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setSelectedProvider(null);
    setShowRoleModal(false);
    setShowLogoutConfirm(false);
  };

  const searchResults = useMemo(() => {
    const terms = menuQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      return [];
    }

    return platformMenuItems
      .map((item) => ({ item, score: scoreMenuItem(item, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label))
      .slice(0, 6)
      .map((entry) => entry.item);
  }, [menuQuery]);

  const loadHeaderSummary = useCallback(async () => {
    if (!isSignedIn || !walletAddress) {
      setRecentMessages([]);
      setNotifications([]);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
      setProfile(null);
      return;
    }

    try {
      const [messageCountResponse, notificationCountResponse, userProfile] = await Promise.all([
        getUnreadMessageCount(),
        getUnreadNotificationCount(),
        getUserProfile(walletAddress).catch(() => null),
      ]);

      setUnreadMessageCount(messageCountResponse.count);
      setUnreadNotificationCount(notificationCountResponse.count);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load header summary:', error);
    }
  }, [isSignedIn, walletAddress]);

  const loadRecentMessages = useCallback(async () => {
    if (!isSignedIn) {
      setRecentMessages([]);
      return;
    }

    try {
      const rows = await getConversations();
      setRecentMessages(rows.slice(0, 5));
    } catch (error) {
      console.error('Failed to load recent messages:', error);
    }
  }, [isSignedIn]);

  const loadNotifications = useCallback(async () => {
    if (!isSignedIn) {
      setNotifications([]);
      return;
    }

    try {
      const rows = await getNotifications();
      setNotifications(rows);
      setUnreadNotificationCount(rows.filter((notification) => !notification.isRead).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [isSignedIn]);

  useEffect(() => {
    loadHeaderSummary();
  }, [loadHeaderSummary]);

  useEffect(() => {
    if (!isSignedIn) {
      setShowMessages(false);
      setShowNotifications(false);
      setShowLogoutConfirm(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadHeaderSummary();
      if (showMessages) {
        loadRecentMessages();
      }
      if (showNotifications) {
        loadNotifications();
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadHeaderSummary, loadNotifications, loadRecentMessages, showMessages, showNotifications]);

  useEffect(() => {
    if (showMessages) {
      loadRecentMessages();
    }
  }, [loadRecentMessages, showMessages]);

  useEffect(() => {
    if (showNotifications) {
      loadNotifications();
    }
  }, [loadNotifications, showNotifications]);

  const handleNotificationClick = async (notification: ApiNotification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((entry) => (entry.id === notification.id ? { ...entry, isRead: true } : entry)),
        );
        setUnreadNotificationCount((current) => Math.max(0, current - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMessageClick = (conversation: ApiConversation) => {
    if (conversation.unreadCount > 0) {
      setRecentMessages((current) =>
        current.map((entry) => (entry.id === conversation.id ? { ...entry, unreadCount: 0 } : entry)),
      );
      setUnreadMessageCount((current) => Math.max(0, current - conversation.unreadCount));
    }

    setShowMessages(false);
    navigate(`/messages?conversation=${conversation.id}`);
  };

  const handleMenuSelection = (item: PlatformMenuItem) => {
    setMenuQuery('');
    setShowMobileSearch(false);
    navigate(item.path);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault();
      handleMenuSelection(searchResults[0]);
    }

    if (event.key === 'Escape') {
      setMenuQuery('');
    }
  };

  return (
    <>
      <AnnouncementBar navigate={navigate} />
      <header className="fixed top-12 left-0 md:left-[120px] right-0 h-20 bg-bg/80 backdrop-blur-xl border-b border-border z-40 px-3 sm:px-4 md:px-10 flex items-center justify-between overflow-x-clip">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8 min-w-0">
        <Link to="/" className="flex items-center md:hidden">
          <img src="/favicon.png" alt="STXWORX" className="w-11 h-11 rounded-[12px] object-cover border border-white/20 shadow-[0_0_12px_rgba(255,94,0,0.35)]" />
        </Link>
        <Link to="/" className="hidden md:flex items-center">
          <Shared.Logo className="text-3xl" />
        </Link>
        <button
          type="button"
          onClick={() => setShowMobileSearch(true)}
          className="md:hidden p-2 rounded-[15px] bg-surface border border-border text-muted hover:text-ink hover:bg-ink/5 transition-colors"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
        <div className="relative hidden md:block w-28 sm:w-40 md:w-64 xl:w-96">
          <div className="flex items-center gap-2 sm:gap-4 bg-surface px-3 sm:px-4 py-2 rounded-[15px] border border-border">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              value={menuQuery}
              onChange={(event) => setMenuQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search platform menus..."
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-muted outline-none"
            />
          </div>

          <AnimatePresence>
            {menuQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute top-full left-0 right-0 mt-3 bg-surface border border-border rounded-[15px] shadow-2xl overflow-hidden z-50"
              >
                {searchResults.length > 0 ? (
                  searchResults.map((item) => {
                    const Icon = menuIconMap[item.iconKey];

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuSelection(item)}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-ink/5 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-[12px] bg-ink/5 border border-border flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{item.label}</p>
                          <p className="text-[10px] text-muted truncate">{item.path}</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-[10px] text-muted">No matching menu items.</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-[15px] hover:bg-ink/5 text-muted hover:text-ink transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          onClick={() => (isSignedIn ? setShowLogoutConfirm(true) : handleConnect())}
          className={`flex items-center justify-center sm:justify-start gap-2 min-w-10 h-10 px-2 sm:px-4 rounded-[15px] text-xs font-bold transition-all ${isSignedIn ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20' : 'bg-ink text-bg hover:bg-accent-orange'} ${isBlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={isBlocked}
        >
          <Wallet size={16} />
          <span className="hidden sm:inline">{isSignedIn ? displayWalletAddress : 'Connect Wallet'}</span>
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowMessages(!showMessages); setShowNotifications(false); }}
            className={`relative transition-colors p-2 rounded-[15px] hover:bg-ink/5 ${showMessages ? 'text-ink bg-ink/5' : unreadMessageCount > 0 ? 'text-accent-cyan' : 'text-muted hover:text-ink'}`}
          >
            <MessageCircle size={20} />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-cyan text-bg rounded-full text-[9px] font-black flex items-center justify-center">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showMessages && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed top-36 left-2 right-2 mt-0 w-auto bg-surface border border-border rounded-[15px] shadow-2xl overflow-hidden z-50 md:absolute md:top-full md:left-auto md:right-0 md:mt-4 md:w-80"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-sm">Recent Messages</h3>
                  <button onClick={() => setShowMessages(false)} className="text-muted hover:text-ink"><X size={16} /></button>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {!isSignedIn && (
                    <div className="p-4 text-[10px] text-muted">Connect your wallet to view messages.</div>
                  )}
                  {isSignedIn && recentMessages.map((conversation) => {
                    const displayName = toDisplayName(conversation.participant || null);

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleMessageClick(conversation)}
                        className={`w-full text-left p-4 flex items-start gap-4 hover:bg-ink/5 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${conversation.unreadCount > 0 ? 'bg-ink/5' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-[10px] bg-ink/10 overflow-hidden shrink-0 flex items-center justify-center font-black">
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1 gap-3">
                            <p className={`text-xs truncate ${conversation.unreadCount > 0 ? 'font-black' : 'font-bold'}`}>{displayName}</p>
                            <p className="text-[10px] text-muted shrink-0">{formatRelativeTime(conversation.lastMessageAt)}</p>
                          </div>
                          <p className={`text-[10px] truncate ${conversation.unreadCount > 0 ? 'text-ink font-bold' : 'text-muted'}`}>
                            {conversation.lastMessage || 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {isSignedIn && recentMessages.length === 0 && (
                    <div className="p-4 text-[10px] text-muted">No conversations yet.</div>
                  )}
                </div>
                <Link
                  to="/messages"
                  onClick={() => setShowMessages(false)}
                  className="block w-full text-center p-3 text-[10px] font-bold text-muted hover:text-ink transition-colors bg-ink/5"
                >
                  View All Messages
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); }}
            className={`relative transition-colors p-2 rounded-[15px] hover:bg-ink/5 ${showNotifications ? 'text-ink bg-ink/5' : unreadNotificationCount > 0 ? 'text-accent-red' : 'text-muted hover:text-ink'}`}
          >
            <Bell size={20} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-red text-bg rounded-full text-[9px] font-black flex items-center justify-center">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed top-36 left-2 right-2 mt-0 w-auto bg-surface border border-border rounded-[15px] shadow-2xl overflow-hidden z-50 md:absolute md:top-full md:left-auto md:right-0 md:mt-4 md:w-80"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-sm">Recent Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-muted hover:text-ink"><X size={16} /></button>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {notifications.slice(0, 5).map((notification) => {
                    const meta = getNotificationMeta(notification.type);
                    const Icon = meta.icon;

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-4 flex items-start gap-4 hover:bg-ink/5 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${notification.isRead ? '' : 'bg-ink/5'}`}
                      >
                        <div className={`w-8 h-8 rounded-[15px] ${meta.color} flex items-center justify-center text-bg`}>
                          <Icon size={14} className={meta.color === 'bg-ink/20' ? 'text-ink' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-xs truncate ${notification.isRead ? 'font-bold' : 'font-black'}`}>{notification.title}</p>
                            <p className="text-[10px] text-muted shrink-0">{formatRelativeTime(notification.createdAt)}</p>
                          </div>
                          <p className={`text-[10px] truncate mt-1 ${notification.isRead ? 'text-muted' : 'text-ink font-bold'}`}>{notification.message}</p>
                        </div>
                      </button>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="p-4 text-[10px] text-muted">No notifications yet.</div>
                  )}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="block w-full text-center p-3 text-[10px] font-bold text-muted hover:text-ink transition-colors bg-ink/5"
                >
                  View All Notifications
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden sm:block h-8 w-[1px] bg-border"></div>
        <Link to="/profile" className="flex items-center gap-2 sm:gap-3 group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold group-hover:text-accent-orange transition-colors">{displayName}</p>
            <p className="text-[10px] text-muted">{userRole ? `${userRole[0].toUpperCase()}${userRole.slice(1)}` : 'Member'}</p>
          </div>
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt="Profile"
              className="w-10 h-10 rounded-[10px] object-cover border-2 border-border group-hover:border-accent-orange transition-all"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-[10px] border-2 border-border group-hover:border-accent-orange transition-all bg-ink/10 flex items-center justify-center font-black">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>

    <AnimatePresence>
      {showMobileSearch && (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setShowMobileSearch(false);
              setMenuQuery('');
            }}
            className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[95] md:hidden"
            aria-label="Close search"
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed top-36 left-3 right-3 bg-surface border border-border rounded-[15px] shadow-2xl overflow-hidden z-[96] md:hidden"
          >
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                value={menuQuery}
                onChange={(event) => setMenuQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search platform menus..."
                autoFocus
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-muted outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setShowMobileSearch(false);
                  setMenuQuery('');
                }}
                className="text-muted hover:text-ink"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto no-scrollbar">
              {menuQuery.trim().length === 0 ? (
                <div className="px-4 py-3 text-[10px] text-muted">Start typing to search menus.</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const Icon = menuIconMap[item.iconKey];

                  return (
                    <button
                      key={`mobile-search-${item.id}`}
                      onClick={() => handleMenuSelection(item)}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-ink/5 transition-colors border-b border-border/50 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-[12px] bg-ink/5 border border-border flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.label}</p>
                        <p className="text-[10px] text-muted truncate">{item.path}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-[10px] text-muted">No matching menu items.</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showRoleModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface border border-border rounded-[15px] p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedProvider(null);
              }}
              className="absolute top-4 right-4 text-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black mb-6 text-center">Select Role</h3>
            {isBlocked && (
              <div className="bg-accent-red/10 border border-accent-red text-accent-red p-4 rounded-[15px] mb-6 text-sm text-center font-bold">
                This wallet has been blocked by the administrator.
              </div>
            )}
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelection('client')}
                className="w-full py-4 rounded-[15px] border border-border hover:border-accent-cyan hover:bg-accent-cyan/5 transition-all font-bold flex flex-col items-center gap-2"
              >
                <span className="text-accent-cyan"><Briefcase size={24} /></span>
                Connect as Client
              </button>
              <button
                onClick={() => handleRoleSelection('freelancer')}
                className="w-full py-4 rounded-[15px] border border-border hover:border-accent-orange hover:bg-accent-orange/5 transition-all font-bold flex flex-col items-center gap-2"
              >
                <span className="text-accent-orange"><PenTool size={24} /></span>
                Connect as Freelancer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface border border-border rounded-[15px] p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black mb-3 text-center">Logout Wallet?</h3>
            <p className="text-sm text-muted text-center leading-relaxed">
              You are about to disconnect {displayWalletAddress}. Your current wallet session will be signed out.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 rounded-[15px] border border-border hover:bg-ink/5 transition-all font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full py-3 rounded-[15px] bg-accent-red text-bg hover:opacity-90 transition-all font-bold text-sm"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
};
