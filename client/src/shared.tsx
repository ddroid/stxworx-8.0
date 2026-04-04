import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Globe, LayoutGrid, Users, BookOpen, Briefcase, Calendar, ShoppingBag, Newspaper,
  ChevronRight, Star, Plus, Heart, MessageSquare, Share2, MapPin, Link as LinkIcon, Twitter, Instagram,
  Facebook, MoreHorizontal, ArrowRight, Filter, CheckCircle2, Trophy, ChevronLeft, ChevronsRight, ChevronDown,
  Wallet, Send, X, Settings, ShieldCheck, LogOut, Mail, Phone, MessageCircle, Sun, Moon, Maximize2, Minimize2,
  HelpCircle, AlertTriangle, Folder, GraduationCap, Home, PenTool, Camera, Edit2, Share, Shield, Upload, FileText,
  Download, Sparkles, Bot, ZoomIn, ZoomOut, Loader2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import type { UserSession } from '@stacks/connect';
import { createProject, createProposal, getCategories, submitMilestone, startConversation, getConversationMessages, sendConversationMessage, getUserProfile, getCurrentUser, getUserProfilePath, toApiAssetUrl, toDisplayName, formatRelativeTime, type ApiConversationMessage } from './lib/api';
import { convertAmount, getUSDValue } from './lib/currency';
import { completeEscrowMilestone } from './lib/escrow';
import type { ApiCategory } from './types/job';
import type { ApiUserProfile } from './types/user';

export interface WalletContextType {
    walletAddress: string | null;
    setWalletAddress: (address: string | null) => void;
    userRole: 'client' | 'freelancer' | null;
    setUserRole: (role: 'client' | 'freelancer' | null) => void;
    blockedWallets: string[];
    blockWallet: (address: string) => void;
    unblockWallet: (address: string) => void;
    isWorkSubmitted: boolean;
    setIsWorkSubmitted: (submitted: boolean) => void;
    connect: (role?: 'client' | 'freelancer') => void;
    disconnect: () => void;
    completeRoleSelection: (role: 'client' | 'freelancer') => Promise<void>;
    isSignedIn: boolean;
    userSession: UserSession | null;
    userData: any;
    needsRoleSelection: boolean;
}

export const WalletContext = createContext<WalletContextType>({
      walletAddress: null,
      setWalletAddress: () => {},
      userRole: null,
      setUserRole: () => {},
      blockedWallets: [],
      blockWallet: () => {},
      unblockWallet: () => {},
      isWorkSubmitted: false,
      setIsWorkSubmitted: () => {},
      connect: () => {},
      disconnect: () => {},
      completeRoleSelection: async () => {},
      isSignedIn: false,
      userSession: null,
      userData: null,
      needsRoleSelection: false,
    });
export const useWallet = () => useContext(WalletContext);

type SupportedCurrency = 'STX' | 'sBTC' | 'USDCx';

const getCurrencyPrecision = (currency: SupportedCurrency) => (currency === 'sBTC' ? 8 : currency === 'USDCx' ? 3 : 2);

const getCurrencyStep = (currency: SupportedCurrency) => (currency === 'sBTC' ? '0.00000001' : currency === 'USDCx' ? '0.001' : '0.01');

const formatCurrencyInputValue = (amount: number, currency: SupportedCurrency) => amount
  .toFixed(getCurrencyPrecision(currency))
  .replace(/\.0+$/, '')
  .replace(/(\.\d*?)0+$/, '$1');

export interface StatProps {
    value: string;
    label: string;
    color: string;
}

export interface GroupProps {
    title: string;
    members: string;
    image: string;
    color: string;
}

export interface CourseProps {
    title: string;
    author: string;
    price: string;
    rating: number;
    image: string;
}

export interface WorkProps {
    title: string;
    author: string;
    image: string;
    avatar: string;
    likes: string;
    views: string;
}

export const Logo = ({ className = "" }: { className?: string }) => (
      <img 
        src="/logo.png" 
        alt="STXWORX Logo" 
        className={`h-[1.5em] w-auto object-contain shrink-0 transition-all duration-300 hover:drop-shadow-[0_0_25px_rgba(255,94,0,0.8)] cursor-pointer ${className}`} 
        referrerPolicy="no-referrer"
      />
    );
export const StatCard = ({ value, label, color }: StatProps) => (
      <div className={`p-6 rounded-[15px] flex flex-col justify-between h-40 ${color} text-bg`}>
        <p className="text-3xl sm:text-4xl font-black tracking-tighter">{value}</p>
        <p className="text-sm font-bold opacity-80 leading-tight">{label}</p>
      </div>
    );
export const GroupCard = ({ title, members, image, color }: GroupProps) => (
      <div className="min-w-[230px] sm:min-w-[280px] group cursor-pointer">
        <div className={`aspect-[4/3] rounded-[15px] overflow-hidden mb-4 relative ${color}`}>
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <h3 className="text-xl font-black mb-1">{title}</h3>
            <p className="text-xs font-bold text-white/80">{members} Members</p>
          </div>
        </div>
      </div>
    );
export const CourseCard = ({ title, author, price, rating, image }: CourseProps) => (
      <div className="min-w-[240px] sm:min-w-[300px] card group">
        <div className="aspect-video rounded-[15px] overflow-hidden mb-4 relative">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 right-3 bg-bg/60 backdrop-blur-md px-3 py-1 rounded-[15px] text-[10px] font-bold">
            {price}
          </div>
        </div>
        <h3 className="font-bold text-sm mb-2 line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">by {author}</p>
          <div className="flex items-center gap-1">
            <Star size={12} className="text-accent-orange fill-accent-orange" />
            <span className="text-xs font-bold">{rating}</span>
          </div>
        </div>
      </div>
    );
export const WorkCard = ({ title, author, image, avatar, likes, views }: WorkProps) => (
      <div className="group">
        <div className="aspect-[4/3] rounded-[15px] overflow-hidden mb-4 relative">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button className="w-10 h-10 bg-white rounded-[15px] flex items-center justify-center text-bg hover:bg-accent-orange transition-colors">
              <Heart size={18} />
            </button>
            <button className="w-10 h-10 bg-white rounded-[15px] flex items-center justify-center text-bg hover:bg-accent-orange transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <img src={avatar} alt={author} className="w-6 h-6 rounded-[6px] object-cover" referrerPolicy="no-referrer" />
            <div>
              <h4 className="text-xs font-bold">{title}</h4>
              <p className="text-[10px] text-muted">{author}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted font-bold">
            <span className="flex items-center gap-1"><Heart size={10} /> {likes}</span>
            <span className="flex items-center gap-1"><Search size={10} /> {views}</span>
          </div>
        </div>
      </div>
    );
export const MilestoneSubmitModal = ({ isOpen, onClose, milestone, onSubmitted }: { isOpen: boolean, onClose: () => void, milestone?: any, onSubmitted?: () => void }) => {
      const [description, setDescription] = useState('');
      const [deliverableUrl, setDeliverableUrl] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const { setIsWorkSubmitted } = useWallet();

      useEffect(() => {
        if (isOpen) {
          setDescription('');
          setDeliverableUrl('');
          setIsSubmitting(false);
        }
      }, [isOpen]);

      if (!isOpen) return null;

      const isResubmission = milestone?.status === 'rejected';

      const handleSubmit = async () => {
        if (!milestone?.projectId || !milestone?.milestoneNum || !deliverableUrl.trim() || !milestone?.projectOnChainId) {
          return;
        }

        setIsSubmitting(true);
        try {
          const completionTxId = await completeEscrowMilestone(milestone.projectOnChainId, milestone.milestoneNum);
          await submitMilestone({
            projectId: milestone.projectId,
            milestoneNum: milestone.milestoneNum,
            deliverableUrl: deliverableUrl.trim(),
            description: description.trim() || undefined,
            completionTxId,
          });
          setIsWorkSubmitted(true);
          onSubmitted?.();
          onClose();
        } catch (error) {
          console.error('Failed to submit milestone:', error);
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
              >
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">
                  {isResubmission ? 'Resubmit Milestone Work' : 'Submit Milestone Work'}
                </h3>
                
                {isResubmission && (
                  <div className="mb-6 p-4 bg-accent-orange/10 border border-accent-orange/20 rounded-[15px]">
                    <p className="text-sm text-accent-orange">
                      Your previous submission was rejected. Please review the feedback and submit updated work.
                    </p>
                  </div>
                )}
                
                {milestone && (
                  <div className="mb-8 p-6 bg-ink/5 rounded-[15px] border border-border">
                    <h4 className="text-xl font-black mb-2">{milestone.title}</h4>
                    <p className="text-sm text-muted leading-relaxed">{milestone.description}</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Amount</p>
                      <p className="font-bold text-accent-cyan">{milestone.amount}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Submission Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-[15px] p-4 text-sm focus:border-accent-orange outline-none transition-colors min-h-[120px]"
                      placeholder="Describe the work you have completed for this milestone..."
                    ></textarea>
                  </div>

                  {/* Attachment */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Attachment</label>
                    <input
                      value={deliverableUrl}
                      onChange={(e) => setDeliverableUrl(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-[15px] p-4 text-sm focus:border-accent-orange outline-none transition-colors"
                      placeholder="Paste deliverable URL"
                    />
                  </div>

                  <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || !deliverableUrl.trim() || !milestone?.projectOnChainId}
                    className="w-full btn-primary py-4 font-bold text-lg justify-center"
                  >
                    {isSubmitting ? 'Opening Wallet...' : (isResubmission ? 'Resubmit Work' : 'Submit Work')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    };
export const ReviewWorkModal = ({ isOpen, onClose, work }: { isOpen: boolean, onClose: () => void, work?: any }) => {
      if (!isOpen) return null;

      return (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
              >
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">Review Submitted Work</h3>
                
                {work && (
                  <div className="mb-8 p-6 bg-ink/5 rounded-[15px] border border-border">
                    <h4 className="text-xl font-black mb-2">{work.title}</h4>
                    <p className="text-sm text-muted leading-relaxed mb-4">{work.description}</p>
                    <div className="p-4 bg-surface border border-border rounded-[15px] mb-4">
                      <p className="text-xs font-bold text-muted mb-2">Freelancer's Note:</p>
                      <p className="text-sm">{work.submissionNote || "Here is the completed work for this milestone."}</p>
                    </div>
                    <div className="flex items-center gap-2 text-accent-cyan hover:underline cursor-pointer text-sm font-bold">
                      <Folder size={16} /> View Attached Files
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Amount to Release</p>
                      <p className="font-bold text-accent-cyan">{work.amount}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 btn-outline py-4 font-bold text-sm"
                  >
                    Request Revisions
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex-1 btn-primary py-4 font-bold text-sm"
                  >
                    Approve & Release Funds
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    };
export const MessageModal = ({ isOpen, onClose, recipientAddress }: { isOpen: boolean, onClose: () => void, recipientAddress: string }) => {
      const [message, setMessage] = useState('');
      const [conversationId, setConversationId] = useState<number | null>(null);
      const [messages, setMessages] = useState<ApiConversationMessage[]>([]);
      const [currentUserId, setCurrentUserId] = useState<number | null>(null);
      const [recipientProfile, setRecipientProfile] = useState<ApiUserProfile | null>(null);
      const [loading, setLoading] = useState(false);
      const [sending, setSending] = useState(false);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        if (isOpen && recipientAddress) {
          const abortController = new AbortController();
          const initialize = async () => {
            setLoading(true);
            setError(null);
            try {
              const [currentUser, recipient] = await Promise.all([
                getCurrentUser(),
                getUserProfile(recipientAddress).catch(() => null)
              ]);
              
              if (abortController.signal.aborted) return;
              
              if (!currentUser || !currentUser.user) {
                throw new Error('Failed to get current user');
              }
              
              setCurrentUserId(currentUser.user.id);
              setRecipientProfile(recipient);
              
              if (recipient) {
                const conversationResponse = await startConversation(recipient.id);
                
                if (abortController.signal.aborted) return;
                
                setConversationId(conversationResponse.id);
                
                const conversationMessages = await getConversationMessages(conversationResponse.id);
                
                if (!abortController.signal.aborted) {
                  setMessages(conversationMessages);
                }
              }
            } catch (error) {
              if (!abortController.signal.aborted) {
                console.error('Failed to initialize conversation:', error);
                setError(error instanceof Error ? error.message : 'Failed to load conversation');
                setTimeout(() => {
                  onClose();
                }, 2000);
              }
            } finally {
              if (!abortController.signal.aborted) {
                setLoading(false);
              }
            }
          };
          
          initialize();
          
          return () => {
            abortController.abort();
          };
        }
      }, [isOpen, recipientAddress, onClose]);
      
      useEffect(() => {
        if (!isOpen) {
          setConversationId(null);
          setMessages([]);
          setCurrentUserId(null);
          setRecipientProfile(null);
          setMessage('');
          setError(null);
        }
      }, [isOpen]);

      const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !conversationId || sending) return;
        
        setSending(true);
        try {
          const sentMessage = await sendConversationMessage(conversationId, message.trim());
          setMessages(prev => [...prev, sentMessage]);
          setMessage('');
        } catch (error) {
          console.error('Failed to send message:', error);
        } finally {
          setSending(false);
        }
      };

      if (!isOpen || !recipientAddress) return null;

      return (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] w-full max-w-md shadow-2xl relative flex flex-col h-[500px] overflow-hidden"
              >
                <div className="p-4 border-b border-border flex items-center justify-between bg-ink/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-accent-orange/20 flex items-center justify-center text-accent-orange font-bold">
                      {toDisplayName(recipientProfile).charAt(0) || recipientAddress.charAt(0) || 'U'}
                    </div>
                    <div>
                      <Link to={getUserProfilePath(recipientProfile)} className="font-bold text-sm hover:text-accent-orange transition-colors">
                        {toDisplayName(recipientProfile) || 'User'}
                      </Link>
                      <p className="text-[10px] text-muted">{recipientProfile?.role || 'User'}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-muted">
                      <div className="text-sm">Loading conversation...</div>
                    </div>
                  ) : error ? (
                    <div className="h-full flex items-center justify-center text-center text-muted">
                      <AlertTriangle size={48} className="mb-4 opacity-20" />
                      <h3 className="text-xl font-black mb-2">Error</h3>
                      <p className="text-sm mb-4">{error}</p>
                      <button onClick={onClose} className="btn-primary py-2 px-4 text-sm">Close</button>
                    </div>
                  ) : !recipientProfile ? (
                    <div className="h-full flex items-center justify-center text-center text-muted">
                      <MessageCircle size={48} className="mb-4 opacity-20" />
                      <h3 className="text-xl font-black mb-2">User Not Found</h3>
                      <p className="text-sm">Unable to find this user's profile.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center text-[10px] text-muted font-bold uppercase tracking-widest my-4">
                          No messages yet. Start the conversation below.
                        </div>
                      )}
                      {messages.map((msg) => {
                        const isMine = msg.senderId === currentUserId;
                        const attachmentUrl = toApiAssetUrl(msg.attachmentUrl);
                        const isImageAttachment = Boolean(attachmentUrl && msg.attachmentMimeType?.startsWith('image/'));
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-[15px] text-xs font-medium ${isMine ? 'bg-ink text-bg rounded-tr-none' : 'bg-ink/5 text-ink rounded-tl-none border border-border'}`}>
                              {attachmentUrl ? (
                                isImageAttachment ? (
                                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block mb-2">
                                    <img src={attachmentUrl} alt={msg.attachmentName || 'Uploaded image'} className="max-h-52 w-auto rounded-[12px] object-cover" referrerPolicy="no-referrer" />
                                  </a>
                                ) : (
                                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className={`mb-2 flex items-center justify-between gap-3 rounded-[12px] border px-3 py-2 ${isMine ? 'border-bg/15 bg-bg/10 text-bg' : 'border-border bg-surface text-ink'}`}>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">{msg.attachmentName || 'Attachment'}</p>
                                      <p className={`text-[9px] truncate ${isMine ? 'text-bg/70' : 'text-muted'}`}>{msg.attachmentMimeType || 'File'}</p>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest shrink-0">Open</span>
                                  </a>
                                )
                              ) : null}
                              {msg.body ? <p>{msg.body}</p> : null}
                              <p className={`text-[9px] mt-1 ${isMine ? 'text-bg/70' : 'text-muted'}`}>
                                {formatRelativeTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {conversationId && (
                  <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sending}
                      className="flex-1 bg-ink/5 border border-border rounded-[15px] px-4 py-2 text-xs focus:ring-1 focus:ring-accent-orange outline-none disabled:opacity-50"
                    />
                    <button 
                      type="submit" 
                      disabled={sending || !message.trim()}
                      className="w-10 h-10 bg-ink text-bg rounded-[15px] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    };
  export const PostJobModal = ({ isOpen, onClose, onCreated }: { isOpen: boolean, onClose: () => void, onCreated?: () => void }) => {
      const [milestones, setMilestones] = useState(4);
      const [title, setTitle] = useState('');
      const [description, setDescription] = useState('');
      const [totalBudget, setTotalBudget] = useState('');
      const [currency, setCurrency] = useState<SupportedCurrency>('STX');
      const [categories, setCategories] = useState<ApiCategory[]>([]);
      const [selectedCategory, setSelectedCategory] = useState('');
      const [selectedSubcategory, setSelectedSubcategory] = useState('');
      const [milestoneTitles, setMilestoneTitles] = useState<string[]>(['', '', '', '']);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [isConvertingBudget, setIsConvertingBudget] = useState(false);
      const [pendingCurrency, setPendingCurrency] = useState<SupportedCurrency | null>(null);
      const [usdValue, setUsdValue] = useState<number | null>(null);

      useEffect(() => {
        if (!isOpen) {
          return;
        }

        getCategories()
          .then((rows) => {
            setCategories(rows);
            const firstCategory = rows[0]?.name || '';
            setSelectedCategory((current) => current || firstCategory);
            const firstSubcategory = rows[0]?.subcategories?.[0] || '';
            setSelectedSubcategory((current) => current || firstSubcategory);
          })
          .catch((error) => {
            console.error('Failed to load categories:', error);
          });
      }, [isOpen]);

      useEffect(() => {
        const selected = categories.find((category) => category.name === selectedCategory);
        if (selected && !selected.subcategories.includes(selectedSubcategory)) {
          setSelectedSubcategory(selected.subcategories[0] || '');
        }
      }, [categories, selectedCategory, selectedSubcategory]);

      useEffect(() => {
        const numericBudget = Number(totalBudget);

        if (!totalBudget.trim() || !Number.isFinite(numericBudget) || numericBudget < 0) {
          setUsdValue(null);
          return;
        }

        let cancelled = false;

        const updateUsdValue = async () => {
          try {
            const value = await getUSDValue(numericBudget, currency);
            if (!cancelled) {
              setUsdValue(value);
            }
          } catch (error) {
            console.error('Failed to get post job USD value:', error);
            if (!cancelled) {
              setUsdValue(null);
            }
          }
        };

        updateUsdValue();

        return () => {
          cancelled = true;
        };
      }, [totalBudget, currency]);

      if (!isOpen) return null;

      const budgetPrecision = getCurrencyPrecision(currency);
      const amountPerMilestone = totalBudget ? (Number(totalBudget) / milestones).toFixed(budgetPrecision) : '';

      const handleCurrencyChange = async (nextCurrency: SupportedCurrency) => {
        if (nextCurrency === currency || isConvertingBudget) {
          return;
        }

        if (!totalBudget.trim()) {
          setCurrency(nextCurrency);
          return;
        }

        const numericBudget = Number(totalBudget);
        if (!Number.isFinite(numericBudget) || numericBudget < 0) {
          return;
        }

        setPendingCurrency(nextCurrency);
        setIsConvertingBudget(true);
        try {
          const convertedBudget = await convertAmount(numericBudget, currency, nextCurrency);
          setCurrency(nextCurrency);
          setTotalBudget(formatCurrencyInputValue(convertedBudget, nextCurrency));
        } catch (error) {
          console.error('Failed to convert post job budget:', error);
        } finally {
          setIsConvertingBudget(false);
          setPendingCurrency(null);
        }
      };

      const handlePostJob = async () => {
        if (!title.trim() || !description.trim() || !totalBudget || !selectedCategory || milestoneTitles.slice(0, milestones).some((entry) => !entry.trim())) {
          return;
        }

        setIsSubmitting(true);
        try {
          await createProject({
            title: title.trim(),
            description: description.trim(),
            category: selectedCategory,
            subcategory: selectedSubcategory || undefined,
            tokenType: currency,
            numMilestones: milestones,
            milestone1Title: milestoneTitles[0].trim(),
            milestone1Description: milestoneTitles[0].trim(),
            milestone1Amount: amountPerMilestone,
            milestone2Title: milestones >= 2 ? milestoneTitles[1].trim() : undefined,
            milestone2Description: milestones >= 2 ? milestoneTitles[1].trim() : undefined,
            milestone2Amount: milestones >= 2 ? amountPerMilestone : undefined,
            milestone3Title: milestones >= 3 ? milestoneTitles[2].trim() : undefined,
            milestone3Description: milestones >= 3 ? milestoneTitles[2].trim() : undefined,
            milestone3Amount: milestones >= 3 ? amountPerMilestone : undefined,
            milestone4Title: milestones >= 4 ? milestoneTitles[3].trim() : undefined,
            milestone4Description: milestones >= 4 ? milestoneTitles[3].trim() : undefined,
            milestone4Amount: milestones >= 4 ? amountPerMilestone : undefined,
          });
          onCreated?.();
          onClose();
        } catch (error) {
          console.error('Failed to create project:', error);
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
              >
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">Post New Job</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Job Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                      placeholder="e.g. Smart Contract Developer Needed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Description</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none h-32 resize-none"
                      placeholder="Describe the job requirements..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-surface text-ink border border-border rounded-[15px] px-4 py-3 text-sm outline-none"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.name} className="bg-surface text-ink">
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Subcategory</label>
                      <select
                        value={selectedSubcategory}
                        onChange={(e) => setSelectedSubcategory(e.target.value)}
                        className="w-full bg-surface text-ink border border-border rounded-[15px] px-4 py-3 text-sm outline-none"
                      >
                        {(categories.find((category) => category.name === selectedCategory)?.subcategories || []).map((subcategory) => (
                          <option key={subcategory} value={subcategory} className="bg-surface text-ink">
                            {subcategory}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Attachments</label>
                    <div className="border-2 border-dashed border-border rounded-[15px] p-6 text-center hover:border-accent-orange transition-colors cursor-pointer">
                      <Upload size={24} className="mx-auto mb-2 text-muted" />
                      <p className="text-sm font-bold">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted">PDF, DOCX, PNG, JPG up to 10MB</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Total Budget & Currency</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <input 
                          type="number" 
                          value={totalBudget}
                          onChange={(e) => {
                            const value = e.target.value;
                            
                            // Prevent negative values
                            if (value.startsWith('-')) return;
                            
                            // Check decimal precision based on currency
                            const decimalIndex = value.indexOf('.');
                            if (decimalIndex !== -1) {
                              const decimalPlaces = value.length - decimalIndex - 1;
                              const maxDecimalPlaces = getCurrencyPrecision(currency);
                              
                              // Prevent typing more decimals than allowed
                              if (decimalPlaces > maxDecimalPlaces) return;
                            }
                            
                            // Update amount if valid
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              setTotalBudget(value);
                            }
                          }}
                          className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                          placeholder="e.g. 1000"
                          step={getCurrencyStep(currency)}
                        />
                        {usdValue !== null && (
                          <p className="mt-2 text-xs text-muted">
                            ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 md:w-1/2">
                        {['STX', 'sBTC', 'USDCx'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleCurrencyChange(c as SupportedCurrency)}
                            disabled={isConvertingBudget}
                            className={`flex-1 py-3 px-2 rounded-[15px] font-bold text-sm transition-all border ${
                              currency === c 
                                ? 'bg-accent-orange text-white border-transparent' 
                                : 'bg-ink/5 border-border text-muted hover:border-ink/30'
                            } ${isConvertingBudget ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {isConvertingBudget && pendingCurrency === c ? <Loader2 size={14} className="animate-spin mx-auto" /> : c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-muted">Number of Milestones</label>
                      <span className="text-sm font-bold text-accent-orange">{milestones}</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="4" 
                      value={milestones}
                      onChange={(e) => setMilestones(parseInt(e.target.value))}
                      className="w-full h-2 bg-ink/10 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                    />
                    <div className="flex justify-between text-[10px] text-muted mt-2 font-bold">
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Array.from({ length: milestones }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={milestoneTitles[i] || ''}
                            onChange={(e) =>
                              setMilestoneTitles((current) => {
                                const next = [...current];
                                next[i] = e.target.value;
                                return next;
                              })
                            }
                            placeholder={`Milestone ${i + 1} Title`}
                            className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                          />
                        </div>
                        <div className="w-1/3">
                          <input 
                            type="text" 
                            value={amountPerMilestone}
                            readOnly
                            placeholder={`Amount (${currency})`}
                            className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none opacity-70 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-accent-cyan/10 border border-accent-cyan/20 rounded-[15px]">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="text-accent-cyan shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-accent-cyan mb-1">Escrow Protection</h4>
                        <p className="text-xs text-muted">After a freelancer accepts the job, you can set up an escrow account to finalize the deal and secure funds.</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handlePostJob}
                    disabled={isSubmitting || isConvertingBudget}
                    className="w-full btn-primary py-4 justify-center"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    };
export const JobApplyModal = ({ isOpen, onClose, job, onSubmitted }: { isOpen: boolean, onClose: () => void, job?: any, onSubmitted?: () => void | Promise<void> }) => {
      const [amount, setAmount] = useState(typeof job?.rawBudget === 'number' ? job.rawBudget : 1000);
      const [milestones, setMilestones] = useState(2);
      const [useEscrow, setUseEscrow] = useState(true);
      const [coverLetter, setCoverLetter] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [usdValue, setUsdValue] = useState<number | null>(null);
      const currency = (job?.currency || 'STX') as SupportedCurrency;

      useEffect(() => {
        if (isOpen) {
          setCoverLetter('');
          setIsSubmitting(false);
          // Set initial amount and currency from job if available
          if (job) {
            setAmount(typeof job.rawBudget === 'number' ? job.rawBudget : 1000);
          }
        }
      }, [isOpen, job]);

      // Update USD value when amount or currency changes
      useEffect(() => {
        const updateUSDValue = async () => {
          try {
            const value = await getUSDValue(amount, currency);
            setUsdValue(value);
          } catch (error) {
            console.error('Failed to get USD value:', error);
            setUsdValue(null);
          }
        };
        updateUSDValue();
      }, [amount, currency]);

      if (!isOpen) return null;

      const platformFee = amount * 0.1;
      const freelancerAmount = amount * 0.9;

      const handleSubmitProposal = async () => {
        if (!job?.id || !coverLetter.trim() || amount <= 0) {
          return;
        }

        setIsSubmitting(true);
        try {
          const proposedAmount = amount
            .toFixed(getCurrencyPrecision(currency))
            .replace(/\.0+$/, '')
            .replace(/(\.\d*?)0+$/, '$1');

          await createProposal({
            projectId: job.id,
            coverLetter: coverLetter.trim(),
            proposedAmount,
          });
          await onSubmitted?.();
          onClose();
        } catch (error) {
          console.error('Failed to create proposal:', error);
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
              >
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">Apply for Job</h3>
                
                {job && (
                  <div className="mb-8 p-6 bg-ink/5 rounded-[15px] border border-border">
                    <h4 className="text-xl font-black mb-2">{job.title}</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-accent-orange/10 text-accent-orange border border-accent-orange/20 rounded-[15px] text-[10px] font-bold uppercase tracking-widest">{job.category}</span>
                      <span className="text-muted text-xs">•</span>
                      <span className="px-3 py-1 bg-surface border border-border rounded-[15px] text-[10px] font-bold uppercase tracking-widest text-muted">{job.subCategory}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed mb-4">{job.fullDescription || job.description}</p>
                    <div className="flex gap-2">
                      {job.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-surface border border-border rounded-[15px] text-[10px] font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* Escrow Selection */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-[15px] bg-ink/5">
                    <div>
                      <h4 className="font-bold">Use Smart Contract Escrow</h4>
                      <p className="text-xs text-muted">Secure your payment in a smart contract until milestones are met.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={useEscrow} onChange={() => setUseEscrow(!useEscrow)} />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan"></div>
                    </label>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Proposal Description</label>
                    <textarea 
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full bg-transparent border border-border rounded-[15px] p-4 text-sm focus:border-accent-orange outline-none transition-colors min-h-[120px]"
                      placeholder="Describe why you're the best fit for this job and your approach..."
                    ></textarea>
                  </div>

                  {/* Attachment */}
                  <div>
                    <label className="block text-sm font-bold mb-2">Attachment</label>
                    <div className="border-2 border-dashed border-border rounded-[15px] p-6 text-center hover:border-accent-orange transition-colors cursor-pointer">
                      <Folder size={24} className="mx-auto mb-2 text-muted" />
                      <p className="text-sm font-bold">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted">PDF, DOCX, or ZIP (Max 10MB)</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  {job?.milestones ? (
                    <div>
                      <label className="block text-sm font-bold mb-4">Client Specified Milestones</label>
                      <div className="space-y-3">
                        {job.milestones.map((milestone: any, index: number) => (
                          <div key={index} className="p-4 border border-border rounded-[15px] bg-ink/5 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm">{index + 1}. {milestone.title}</p>
                              <p className="text-xs text-muted">{milestone.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-accent-cyan">{milestone.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-bold mb-2">Number of Milestones</label>
                      <div className="flex gap-4">
                        {[2, 3, 4].map(num => (
                          <button 
                            key={num}
                            onClick={() => setMilestones(num)}
                            className={`flex-1 py-3 rounded-[15px] border font-bold transition-all ${milestones === num ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' : 'border-border hover:border-ink/30'}`}
                          >
                            {num} Milestones
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amount & Currency */}
                    <div>
                      <label className="block text-sm font-bold mb-2">Total Project Amount</label>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // Prevent negative values
                          if (value.startsWith('-')) return;
                          
                          // Check decimal precision based on currency
                          const decimalIndex = value.indexOf('.');
                          if (decimalIndex !== -1) {
                            const decimalPlaces = value.length - decimalIndex - 1;
                            const maxDecimalPlaces = getCurrencyPrecision(currency);
                            
                            // Prevent typing more decimals than allowed
                            if (decimalPlaces > maxDecimalPlaces) return;
                          }
                          
                          // Update amount if valid
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setAmount(numValue);
                          }
                        }}
                        className="w-full bg-transparent border border-border rounded-[15px] p-4 text-sm focus:border-accent-orange outline-none transition-colors"
                        min="0"
                        step={getCurrencyStep(currency)}
                      />
                    </div>

                  {/* Fee Breakdown */}
                  <div className="bg-ink/5 rounded-[15px] p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Total Amount</span>
                      <div className="text-right">
                        <span className="font-bold">
                          {amount.toFixed(getCurrencyPrecision(currency))} {currency}
                        </span>
                        {usdValue !== null && (
                          <div className="text-xs text-muted">
                            ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Platform Fee (10%)</span>
                      <div className="text-right">
                        <span className="font-bold text-accent-red">
                          -{currency === 'sBTC' ? platformFee.toFixed(8) : currency === 'USDCx' ? platformFee.toFixed(3) : platformFee.toFixed(2)} {currency}
                        </span>
                        {usdValue !== null && (
                          <div className="text-xs text-muted">
                            ≈ -${(usdValue * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="h-[1px] bg-border my-2"></div>
                    <div className="flex justify-between text-base font-black">
                      <span>You'll Receive (90%)</span>
                      <div className="text-right">
                        <span className="text-accent-cyan">
                          {currency === 'sBTC' ? freelancerAmount.toFixed(8) : currency === 'USDCx' ? freelancerAmount.toFixed(3) : freelancerAmount.toFixed(2)} {currency}
                        </span>
                        {usdValue !== null && (
                          <div className="text-xs text-accent-cyan">
                            ≈ ${(usdValue * 0.9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitProposal}
                    disabled={isSubmitting || !coverLetter.trim()}
                    className="btn-primary w-full py-4 text-lg"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      );
    };
export const CustomCursor = () => {
      const [position, setPosition] = useState({ x: 0, y: 0 });
      const [isHovering, setIsHovering] = useState(false);

      useEffect(() => {
        const updatePosition = (e: MouseEvent) => {
          setPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (
            target.tagName.toLowerCase() === 'button' || 
            target.tagName.toLowerCase() === 'a' || 
            target.closest('button') || 
            target.closest('a') || 
            target.classList.contains('cursor-pointer')
          ) {
            setIsHovering(true);
          } else {
            setIsHovering(false);
          }
        };

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
          window.removeEventListener('mousemove', updatePosition);
          window.removeEventListener('mouseover', handleMouseOver);
        };
      }, []);

      return (
        <>
          <div 
            className="fixed w-2 h-2 bg-accent-orange rounded-full pointer-events-none z-[9999] transition-transform duration-75 ease-out hidden md:block"
            style={{ 
              left: `${position.x}px`, 
              top: `${position.y}px`,
              transform: `translate(-50%, -50%) ${isHovering ? 'scale(0)' : 'scale(1)'}`
            }}
          />
          <div 
            className="fixed w-8 h-8 border border-accent-orange/50 rounded-full pointer-events-none z-[9998] transition-all duration-300 ease-out hidden md:flex items-center justify-center"
            style={{ 
              left: `${position.x}px`, 
              top: `${position.y}px`,
              transform: `translate(-50%, -50%) ${isHovering ? 'scale(1.5)' : 'scale(1)'}`,
              backgroundColor: isHovering ? 'rgba(255, 94, 0, 0.1)' : 'transparent'
            }}
          >
            <div className={`w-2 h-2 bg-accent-orange rounded-full transition-transform duration-300 ${isHovering ? 'scale(1)' : 'scale(0)'}`} />
          </div>
        </>
      );
    };

export const RequireWallet = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useWallet();

  if (!isSignedIn) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom flex flex-col items-center justify-center min-h-[60vh]">
          <Shield size={48} className="mx-auto mb-6 text-accent-orange" />
          <h2 className="text-3xl font-black mb-4">Connection Required</h2>
          <p className="text-muted text-center max-w-md">Please connect your Bitcoin wallet to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const ProtectedContent = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useWallet();
  const location = useLocation();
  const isPublicProfileRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/');

  if (!isSignedIn && location.pathname !== '/' && !isPublicProfileRoute) {
    return (
      <motion.div
        key="protected"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
        className="pt-28 pb-20 px-6 md:pl-[92px]"
      >
        <div className="container-custom flex flex-col items-center justify-center min-h-[60vh]">
          <Shield size={48} className="mx-auto mb-6 text-accent-orange" />
          <h2 className="text-3xl font-black mb-4">Connection Required</h2>
          <p className="text-muted text-center max-w-md">Please connect your Bitcoin wallet to access this page.</p>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
};
