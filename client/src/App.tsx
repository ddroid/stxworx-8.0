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

import { GoogleGenAI } from '@google/genai';

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
import { SettingsPage } from "./pages/SettingsPage";
import { ProPlanPage } from "./pages/ProPlanPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { BountiesPage } from "./pages/BountyBoardPage";
import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/Navbar";
import { ReviewProposalsPage } from "./pages/ReviewProposalsPage";
import { ReviewWorkPage } from "./pages/ReviewWorkPage";
import { MessagesPage } from "./pages/MessagesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AIProposalGenerator } from "./components/proposals/AIProposalGenerator";

// --- Context ---
// --- Types ---
// --- Components ---
const LiveChat = () => {
  const { walletAddress, blockedWallets } = Shared.useWallet();
  const isBlocked = walletAddress && blockedWallets.includes(walletAddress);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { type: 'bot', text: 'Hi! How can we help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // If user is not connected or is blocked, they cannot use the chat
  if (!walletAddress || isBlocked) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setChat(prev => [...prev, { type: 'user', text: userMessage }]);
    setMessage('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'gen-lang-client-0006349144' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: "You are a helpful customer support agent for STXWORX, a creative platform for designers, freelancers, and architects. Keep your answers concise and friendly.",
        }
      });
      
      setChat(prev => [...prev, { type: 'bot', text: response.text || "Sorry, I couldn't process that request." }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChat(prev => [...prev, { type: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 md:bottom-20 right-0 w-[calc(100vw-32px)] md:w-80 h-[400px] md:h-[450px] bg-surface border border-border rounded-[15px] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 md:p-6 bg-accent-orange text-bg flex items-center justify-between">
              <div>
                <h3 className="font-black tracking-tighter">STXWORX Support</h3>
                <p className="text-[10px] font-bold opacity-60">Online • Usually replies in 5m</p>
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
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-24 bg-accent-orange text-bg rounded-full shadow-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all group"
      >
        {isOpen ? <X size={20} /> : (
          <>
            <MessageCircle size={20} />
            <span className="text-[10px] font-bold rotate-90 origin-center translate-y-2">CHAT</span>
          </>
        )}
      </button>
    </div>
  );
};
// --- Pages ---
const PrivacyPolicyPage = () => (
  <div className="pt-28 pb-20 px-6 md:pl-[92px]">
    <div className="container-custom">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-5xl font-black tracking-tighter mb-8">Privacy Policy</h1>
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
        <h1 className="text-5xl font-black tracking-tighter mb-8">Terms of Service</h1>
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

const ContactPage = () => (
  <div className="pt-28 pb-20 px-6 md:pl-[92px]">
    <div className="container-custom">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-5xl font-black tracking-tighter mb-8">Contact Us</h1>
        <div className="card max-w-2xl">
          <form className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Name</label>
              <input type="text" className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Email</label>
              <input type="email" className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-muted mb-2">Message</label>
              <textarea className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange outline-none min-h-[150px]" placeholder="How can we help?"></textarea>
            </div>
            <button type="button" className="btn-primary w-full py-4 justify-center">Send Message</button>
          </form>
        </div>
      </motion.div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [userRole, setUserRole] = useState<'client' | 'freelancer' | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [blockedWallets, setBlockedWallets] = useState<string[]>([]);
  const [isWorkSubmitted, setIsWorkSubmitted] = useState(false);

  const blockWallet = (address: string) => setBlockedWallets(prev => [...prev, address]);
  const unblockWallet = (address: string) => setBlockedWallets(prev => prev.filter(w => w !== address));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
        <div className="min-h-screen bg-bg text-ink selection:bg-accent-orange selection:text-bg">
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
                        <h1 className="text-[15rem] font-black tracking-tighter mb-0 leading-none text-white/5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">404</h1>
                        <h2 className="text-8xl font-black tracking-tighter mb-8 relative z-10">LOST IN <br /><span className="text-accent-orange">SPACE.</span></h2>
                        <p className="text-xl mb-12 text-muted relative z-10 max-w-md mx-auto">The page you're looking for has drifted into another dimension. Let's get you back home.</p>
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
                <div className="flex gap-8">
                  <Link to="/admin" className="hover:text-ink transition-colors">Admin</Link>
                  <Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
                  <Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
                  <Link to="/contact" className="hover:text-ink transition-colors">Contact</Link>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </Router>
    </WalletProvider>
  );
}
