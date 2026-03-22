
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Globe, LayoutGrid, Users, BookOpen, Briefcase, Calendar, ShoppingBag, Newspaper,
  ChevronRight, Star, Plus, Heart, MessageSquare, Share2, MapPin, Link as LinkIcon, Twitter, Instagram,
  Facebook, MoreHorizontal, ArrowRight, Filter, CheckCircle2, Trophy, ChevronLeft, ChevronsRight, ChevronDown,
  Wallet, Send, X, Settings, ShieldCheck, LogOut, Mail, Phone, MessageCircle, Sun, Moon, Maximize2, Minimize2,
  HelpCircle, AlertTriangle, Folder, GraduationCap, Home, PenTool, Camera, Edit2, Share, Shield, Upload, FileText,
  Download, Sparkles, Bot, ZoomIn, ZoomOut
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as Shared from '../../shared';
import { platformMenuItems } from './navigation';

const sidebarIconMap = {
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
  profile: Users,
  settings: Settings,
} as const;

export const Sidebar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const desktopMenuItems = platformMenuItems
    .filter((item) => ['home', 'dashboard', 'jobs', 'freelancers', 'bounties', 'leaderboard', 'ai-proposal', 'pro', 'settings'].includes(item.id))
    .map((item) => ({
      ...item,
      icon: sidebarIconMap[item.iconKey as keyof typeof sidebarIconMap],
    }));

  const mobileMenuItems = platformMenuItems
    .filter((item) => ['home', 'dashboard', 'jobs', 'freelancers', 'bounties', 'leaderboard', 'ai-proposal', 'messages', 'notifications', 'profile', 'settings', 'pro'].includes(item.id))
    .map((item) => ({
      ...item,
      icon: sidebarIconMap[item.iconKey as keyof typeof sidebarIconMap],
    }));

  const mobilePrimaryIds = ['home', 'dashboard', 'jobs', 'bounties'];
  const mobilePrimaryItems = mobileMenuItems.filter((item) => mobilePrimaryIds.includes(item.id));
  const mobileMoreItems = mobileMenuItems.filter((item) => !mobilePrimaryIds.includes(item.id));

  useEffect(() => {
    setShowMobileMore(false);
  }, [location.pathname]);

  return (
    <aside className="fixed inset-0 pointer-events-none z-[110]">
      <div className="hidden md:flex flex-col gap-4 p-4 h-screen w-max">
        <div className="flex flex-col gap-2 pointer-events-auto w-[60px] items-center">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-10 h-10 bg-[#11151c] rounded-[15px] flex items-center justify-center text-gray-400 hover:text-white transition-colors shadow-lg"
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        <div className="flex flex-col gap-2 h-full pointer-events-auto">
          <div 
            className={`bg-[#11151c] text-white flex flex-col transition-all duration-300 shadow-xl h-fit rounded-[15px] ${isExpanded ? 'w-56' : 'w-[60px]'}`}
          >
            <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden no-scrollbar">
              {desktopMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.label} 
                    to={item.path}
                    className={`flex items-center mx-2 px-3 py-2.5 rounded-[15px] transition-colors group relative ${
                      isActive 
                        ? 'bg-[#272e3f] text-[#70b896]' 
                        : 'text-white hover:bg-[#1f2636]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 ${!isActive ? 'text-gray-400 group-hover:text-white' : ''}`} />
                    <span 
                      className={`ml-3 font-semibold text-xs whitespace-nowrap transition-all duration-300 ${
                        isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute left-10 pointer-events-none'
                      }`}
                    >
                      {item.label}
                    </span>
                    {!isExpanded && (
                      <span className="absolute left-full ml-4 px-2 py-1 bg-[#272e3f] text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className={`py-6 text-center transition-all duration-300 whitespace-nowrap overflow-hidden flex items-center justify-center border-t border-[#1f2937] ${isExpanded ? 'opacity-100 h-16' : 'opacity-0 h-0 py-0 border-t-0'}`}>
              <span className="text-[#374151] text-[10px] font-bold tracking-widest uppercase">
                STXWORX
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <AnimatePresence>
        {showMobileMore && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMobileMore(false)}
              className="fixed inset-0 bg-black/30 md:hidden z-[118]"
              aria-label="Close mobile menu"
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="fixed bottom-20 left-2 right-2 bg-[#11151c]/95 backdrop-blur-xl border border-[#1f2937] rounded-[15px] p-3 md:hidden z-[119] pointer-events-auto"
            >
              <div className="grid grid-cols-2 gap-2">
                {mobileMoreItems.map((item, index) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={`mobile-more-${item.label}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      <Link
                        to={item.path}
                        onClick={() => setShowMobileMore(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[12px] transition-colors ${
                          isActive ? 'bg-[#272e3f] text-[#70b896]' : 'text-gray-300 hover:bg-[#1f2636] hover:text-white'
                        }`}
                      >
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{item.shortLabel || item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div className="fixed bottom-0 left-0 right-0 h-16 pb-[env(safe-area-inset-bottom)] bg-[#11151c]/95 backdrop-blur-xl border-t border-[#1f2937] md:hidden flex items-center justify-around px-2 z-[120] pointer-events-auto">
        {mobilePrimaryItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label} 
              whileTap={{ scale: 0.92 }}
              animate={isActive ? { y: -2, scale: 1.03 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              <Link 
                to={item.path}
                className={`flex flex-col items-center justify-center w-11 h-11 rounded-[15px] transition-colors ${
                  isActive ? 'text-[#70b896]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-bold mt-1">{item.shortLabel || item.label.split(' ')[0]}</span>
              </Link>
            </motion.div>
          );
        })}
        {mobileMoreItems.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            animate={showMobileMore ? { y: -2, rotate: 90 } : { y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            onClick={() => setShowMobileMore((current) => !current)}
            className={`flex flex-col items-center justify-center w-11 h-11 rounded-[15px] transition-colors ${
              showMobileMore ? 'text-[#70b896]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <MoreHorizontal size={19} strokeWidth={showMobileMore ? 2.5 : 2} />
            <span className="text-[9px] font-bold mt-1">More</span>
          </motion.button>
        )}
      </div>
    </aside>
  );
};
