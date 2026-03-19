
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
  settings: Settings,
} as const;

export const Sidebar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = platformMenuItems
    .filter((item) => ['home', 'dashboard', 'jobs', 'freelancers', 'bounties', 'leaderboard', 'ai-proposal', 'pro', 'settings'].includes(item.id))
    .map((item) => ({
      ...item,
      icon: sidebarIconMap[item.iconKey as keyof typeof sidebarIconMap],
    }));

  return (
    <aside className="fixed inset-0 pointer-events-none z-50">
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
              {menuItems.map((item) => {
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
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#11151c] border-t border-[#1f2937] md:hidden flex items-center justify-around px-2 z-50 pointer-events-auto">
        {menuItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-[15px] transition-colors ${
                isActive ? 'text-[#70b896]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] font-bold mt-1">{item.shortLabel || item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};
