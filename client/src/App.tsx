/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Bell, 
  Globe, 
  LayoutGrid, 
  Users, 
  BookOpen, 
  Briefcase, 
  Calendar, 
  ShoppingBag, 
  Newspaper,
  ChevronRight,
  Star,
  Plus,
  Heart,
  MessageSquare,
  Share2,
  MapPin,
  Link as LinkIcon,
  Twitter,
  Instagram,
  Facebook,
  MoreHorizontal,
  ArrowRight,
  Filter,
  CheckCircle2,
  Trophy,
  ChevronLeft,
  ChevronsRight,
  ChevronDown,
  Wallet,
  Send,
  X,
  Settings,
  ShieldCheck,
  LogOut,
  Mail,
  Phone,
  MessageCircle,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  HelpCircle,
  AlertTriangle,
  Folder,
  GraduationCap,
  Home,
  PenTool,
  Camera,
  Edit2,
  Share,
  Shield,
  Upload,
  FileText,
  Download,
  Sparkles,
  Bot,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

import { generateAiText, submitContactForm } from './lib/api';
import { createContext, useContext } from 'react';
import * as Shared from "./shared";
import { WalletProvider } from "./components/wallet/WalletProvider";
import { Home as HomeView } from "./pages/Home";
import { ExploreJobsPage } from "./pages/ExploreJobsPage";
import { FreelancersPage } from "./pages/ExploreFreelancersPage";
import { Leaderboard } from "./pages/leaderboard/Leaderboard";
import { ClientDashboard } from "./pages/client/ClientDashboard";
import { FreelancerDashboard } from "./pages/freelancer/FreelancerDashboard";
import { ProfilePage } from "./pages/ProfilePage";
import { PostPage as SocialPostPage } from "./pages/PostPage";
import { PostsPage } from "./pages/PostsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ProPlanPage } from "./pages/ProPlanPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { BountiesPage } from "./pages/BountyBoardPage";
import { PartnerPage } from "./pages/PartnerPage";
import { ReferralLeaderboardPage } from "./pages/ReferralLeaderboardPage";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/Navbar";
import { ReviewProposalsPage } from "./pages/ReviewProposalsPage";
import { ReviewWorkPage } from "./pages/ReviewWorkPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AIProposalGenerator } from "./components/proposals/AIProposalGenerator";
import { WhitepaperPage } from "./pages/WhitepaperPage";

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const saved = window.localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M20.317 4.369A19.791 19.791 0 0 0 15.885 3c-.192.344-.406.8-.557 1.158a18.27 18.27 0 0 0-5.656 0A12.245 12.245 0 0 0 9.115 3a19.736 19.736 0 0 0-4.433 1.37C1.885 8.555 1.131 12.635 1.508 16.657a19.89 19.89 0 0 0 5.98 3.055c.48-.654.907-1.35 1.27-2.079a12.99 12.99 0 0 1-1.995-.97c.167-.121.329-.247.486-.376c3.85 1.81 8.03 1.81 11.834 0c.16.13.322.256.486.376a12.92 12.92 0 0 1-2 .972a12.92 12.92 0 0 0 1.27 2.077a19.813 19.813 0 0 0 5.98-3.055c.442-4.663-.754-8.706-3.502-12.289ZM8.02 14.23c-1.162 0-2.116-1.07-2.116-2.384c0-1.315.936-2.385 2.116-2.385c1.18 0 2.134 1.07 2.116 2.385c0 1.314-.936 2.384-2.116 2.384Zm7.96 0c-1.162 0-2.116-1.07-2.116-2.384c0-1.315.936-2.385 2.116-2.385c1.18 0 2.134 1.07 2.116 2.385c0 1.314-.936 2.384-2.116 2.384Z" />
  </svg>
);

const XBrandIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M18.244 2H21l-6.02 6.88L22 22h-5.534l-4.338-6.41L6.52 22H3.762l6.44-7.36L2 2h5.676l3.92 5.8L18.244 2Zm-.966 18.35h1.527L6.847 3.568H5.21L17.278 20.35Z" />
  </svg>
);

// --- Context ---
// --- Types ---
// --- Components ---
const LiveChat = () => {
  const { walletAddress, blockedWallets } = Shared.useWallet();
  const isBlocked = Boolean(walletAddress && blockedWallets.includes(walletAddress));
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { type: 'bot', text: 'Hi! How can we help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Hide chat only for blocked wallets; guests can still access support chat.
  if (isBlocked) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setChat(prev => [...prev, { type: 'user', text: userMessage }]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await generateAiText({
        prompt: userMessage,
        systemInstruction: "You are a helpful customer support agent for STXWORX, a creative platform for designers, freelancers, and architects. Keep your answers concise and friendly.",
        temperature: 0.2,
      });
      
      setChat(prev => [...prev, { type: 'bot', text: response.text || "Sorry, I couldn't process that request." }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error?.message || "Sorry, I'm having trouble connecting right now. Please try again later.";
      setChat(prev => [...prev, { type: 'bot', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-56 md:bottom-56 right-4 md:right-8 z-[100]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-24 bg-bg text-accent-orange border-2 border-accent-orange rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-105 transition-all group"
        >
          {isOpen ? <X size={20} /> : (
            <span className="text-[12px] font-bold rotate-90 origin-center">CHAT</span>
          )}
        </button>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="w-full max-w-md h-[400px] md:h-[450px] bg-surface border border-border rounded-[15px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 md:p-6 bg-accent-orange text-bg flex items-center justify-between">
                <div>
                  <h3 className="font-black tracking-tighter">STXWORX Support</h3>
                  <p className="text-[10px] font-bold opacity-60">
                    AI Support Online • Typical response time: under 1 minute
                  </p>
                  {!walletAddress && (
                    <p className="text-[10px] font-semibold opacity-90 mt-1">Sign in for faster support.</p>
                  )}
                </div>
                <button onClick={() => setIsOpen(false)}><X size={20} /></button>
              </div>
              
              <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar space-y-4">
                {chat.map((m, i) => (
                  <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-[15px] text-xs font-medium ${m.type === 'user' ? 'bg-accent-orange text-bg rounded-tr-none' : 'bg-ink/5 text-ink rounded-tl-none border border-border'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-[15px] text-xs font-medium bg-ink/5 text-ink rounded-tl-none border border-border">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="flex-1 bg-ink/5 border border-border rounded-[15px] px-4 py-2 text-xs focus:ring-1 focus:ring-accent-orange disabled:opacity-50"
                />
                <button type="submit" disabled={isLoading} className="w-10 h-10 bg-accent-orange text-bg rounded-[15px] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100">
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
// --- Pages ---
const PrivacyPolicyPage = () => (
  <div className="pt-28 pb-20 px-6 md:pl-[92px]">
    <div className="container-custom">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-8">Privacy Policy</h1>
        <div className="card max-w-4xl prose prose-invert">
          <p className="text-muted leading-relaxed mb-6">Last updated: March 2026</p>
          <h2 className="text-xl font-bold mb-4">1. Information We Collect</h2>
          <p className="text-muted leading-relaxed mb-6">We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.</p>
          <h2 className="text-xl font-bold mb-4">2. How We Use Your Information</h2>
          <p className="text-muted leading-relaxed mb-6">We may use the information we collect about you to provide, maintain, and improve our services, including, for example, to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users, develop safety features, authenticate users, and send product updates and administrative messages.</p>
        </div>
      </motion.div>
    </div>
  </div>
);

const TermsPage = () => (
  <div className="pt-28 pb-20 px-6 md:pl-[92px]">
    <div className="container-custom">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-8">Terms of Service</h1>
        <div className="card max-w-4xl prose prose-invert">
          <p className="text-muted leading-relaxed mb-6">Last updated: March 2026</p>
          <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted leading-relaxed mb-6">By accessing and using STXWORX, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
          <h2 className="text-xl font-bold mb-4">2. User Conduct</h2>
          <p className="text-muted leading-relaxed mb-6">You agree to use the service only for lawful purposes. You agree not to take any action that might compromise the security of the site, render the site inaccessible to others or otherwise cause damage to the site or the Content.</p>
        </div>
      </motion.div>
    </div>
  </div>
);

const ContactPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await submitContactForm({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSubmitStatus({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Failed to send message. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter mb-8">Contact Us</h1>
          <div className="card max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={5000}
                  className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none min-h-[150px]"
                  placeholder="How can we help?"
                />
              </div>
              {submitStatus && (
                <div className={`p-4 rounded-[15px] text-sm font-bold ${submitStatus.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {submitStatus.message}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [userRole, setUserRole] = useState<'client' | 'freelancer' | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [blockedWallets, setBlockedWallets] = useState<string[]>([]);
  const [isWorkSubmitted, setIsWorkSubmitted] = useState(false);

  const blockWallet = (address: string) => setBlockedWallets(prev => [...prev, address]);
  const unblockWallet = (address: string) => setBlockedWallets(prev => prev.filter(w => w !== address));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-bg flex items-center justify-center z-[100]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <Shared.Logo className="text-6xl animate-pulse" />
          <div className="w-48 h-1 bg-ink/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent-orange"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <WalletProvider
      value={{
        walletAddress,
        setWalletAddress,
        userRole,
        setUserRole,
        blockedWallets,
        blockWallet,
        unblockWallet,
        isWorkSubmitted,
        setIsWorkSubmitted,
      }}
    >
      <Router>
        <Shared.CustomCursor />
        <div className="min-h-screen pt-12 bg-bg text-ink selection:bg-accent-orange selection:text-bg overflow-x-hidden pb-16 md:pb-0">
          <TopHeader theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          
          <div className="transition-all duration-500">
            <Sidebar />
            <main className="relative">
              <Shared.ProtectedContent>
                <AnimatePresence mode="wait">
                  <Routes>
                  <Route path="/" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <HomeView />
                    </motion.div>
                  } />
                  <Route path="/dashboard" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      {userRole === 'client' ? <ClientDashboard /> : <FreelancerDashboard />}
                    </motion.div>
                  } />
                  <Route path="/review-proposals" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ReviewProposalsPage />
                    </motion.div>
                  } />
                  <Route path="/review-work" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ReviewWorkPage />
                    </motion.div>
                  } />
                  <Route path="/jobs" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ExploreJobsPage />
                    </motion.div>
                  } />
                  <Route path="/freelancers" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <FreelancersPage />
                    </motion.div>
                  } />
                  <Route path="/leaderboard" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Leaderboard />
                    </motion.div>
                  } />
                  <Route path="/referrals" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <PartnerPage />
                    </motion.div>
                  } />
                  <Route path="/referrals/leaderboard" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ReferralLeaderboardPage />
                    </motion.div>
                  } />
                  <Route path="/bounties" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <BountiesPage />
                    </motion.div>
                  } />
                  <Route path="/privacy" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <PrivacyPolicyPage />
                    </motion.div>
                  } />
                  <Route path="/terms" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <TermsPage />
                    </motion.div>
                  } />
                  <Route path="/contact" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ContactPage />
                    </motion.div>
                  } />
                  <Route path="/pro" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ProPlanPage />
                    </motion.div>
                  } />
                  <Route path="/ai-proposal" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <AIProposalGenerator />
                    </motion.div>
                  } />
                  <Route path="/whitepaper" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <WhitepaperPage />
                    </motion.div>
                  } />
                  <Route path="/settings" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <SettingsPage />
                    </motion.div>
                  } />
                  <Route path="/verify-email" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <VerifyEmailPage />
                    </motion.div>
                  } />
                  <Route path="/admin" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <AdminDashboard />
                    </motion.div>
                  } />
                  <Route path="/post/:id" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SocialPostPage />
                    </motion.div>
                  } />
                  <Route path="/posts" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PostsPage />
                    </motion.div>
                  } />
                  <Route path="/profile" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ProfilePage userRole={userRole} />
                    </motion.div>
                  } />
                  <Route path="/profile/w/:walletAddressParam" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ProfilePage userRole={userRole} />
                    </motion.div>
                  } />
                  <Route path="/profile/:profileIdentifier" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <ProfilePage userRole={userRole} />
                    </motion.div>
                  } />
                  <Route path="/messages" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <MessagesPage />
                    </motion.div>
                  } />
                  <Route path="/notifications" element={
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <NotificationsPage />
                    </motion.div>
                  } />
                  {/* Fallback for other routes */}
                  <Route path="*" element={
                    <div className="pt-40 pb-32 px-6 md:pl-[92px] container-custom text-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <h1 className="text-[7rem] sm:text-[10rem] md:text-[15rem] font-black tracking-tighter mb-0 leading-none text-white/5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">404</h1>
                        <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 relative z-10">LOST IN <br /><span className="text-accent-orange">SPACE.</span></h2>
                        <p className="text-base sm:text-xl mb-12 text-muted relative z-10 max-w-md mx-auto">The page you're looking for has drifted into another dimension. Let's get you back home.</p>
                        <Link to="/" className="btn-primary inline-flex relative z-10">Back to Earth</Link>
                      </motion.div>
                    </div>
                  } />
                </Routes>
              </AnimatePresence>
              </Shared.ProtectedContent>
            </main>

            <LiveChat />

            <footer className="pl-6 md:pl-[92px] py-10 border-t border-border">
              <div className="container-custom flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
                <div className="flex flex-col items-center md:items-start gap-1">
                  <Shared.Logo className="text-sm" />
                  <p className="text-[8px] tracking-widest uppercase">POWERED BY STX - SBTC - USDCX</p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-4">
                  <div className="flex flex-wrap justify-center md:justify-end gap-4 sm:gap-6 md:gap-8">
                    <Link to="/whitepaper" className="hover:text-ink transition-colors">Whitepaper</Link>
                    <Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
                    <Link to="/contact" className="hover:text-ink transition-colors">Contact</Link>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <a
                      href="https://discord.gg/kwwSHtBdNK"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Discord"
                      className="group inline-flex items-center justify-center h-11 w-11 rounded-[14px] border border-accent-orange/70 bg-gradient-to-br from-accent-orange via-[#ff7e2f] to-[#ff5a00] text-bg shadow-[0_10px_28px_rgba(255,107,53,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(255,107,53,0.55)]"
                    >
                      <DiscordIcon className="h-5 w-5" />
                    </a>
                    <a
                      href="https://x.com/stxworx"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="X"
                      className="group inline-flex items-center justify-center h-11 w-11 rounded-[14px] border border-accent-orange/70 bg-gradient-to-br from-accent-orange via-[#ff7e2f] to-[#ff5a00] text-bg shadow-[0_10px_28px_rgba(255,107,53,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(255,107,53,0.55)]"
                    >
                      <XBrandIcon className="h-4.5 w-4.5" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="container-custom mt-6 text-center md:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  © 2026 All rights reserved by{' '}
                  <a 
                    href="https://gowhite.xyz/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-ink hover:text-ink/80 transition-colors duration-300"
                  >
                    White Fintech
                  </a>
                </p>
              </div>
            </footer>
          </div>
        </div>
      </Router>
    </WalletProvider>
  );
}
