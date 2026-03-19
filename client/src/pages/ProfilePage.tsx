import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import * as Shared from '../shared';
import {
  acceptConnection,
  createSocialPost,
  declineConnection,
  formatRelativeTime,
  formatTokenAmount,
  getConnectionSuggestions,
  getConnections,
  getMyBountyDashboard,
  getSocialPosts,
  getUserProfile,
  getUserNfts,
  getUserProjects,
  getUserReviews,
  requestConnection,
  toggleSocialPostLike,
  updateMyProfile,
  type ApiBountyDashboard,
  type ApiConnection,
  type ApiReputationNft,
  type ApiSocialPost,
} from '../lib/api';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview } from '../types/user';

export const ProfilePage = ({ userRole }: { userRole: 'client' | 'freelancer' | null }) => {
  const { walletAddress } = Shared.useWallet();
  const tabs = ['Timeline', 'Profile', 'Bounties', 'Friends', 'NFTs'];
  const [activeTab, setActiveTab] = useState('Profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [reviews, setReviews] = useState<ApiUserReview[]>([]);
  const [timelinePosts, setTimelinePosts] = useState<ApiSocialPost[]>([]);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState<Array<Pick<ApiUserProfile, 'id' | 'stxAddress' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'>>>([]);
  const [bountyDashboard, setBountyDashboard] = useState<ApiBountyDashboard | null>(null);
  const [nfts, setNfts] = useState<ApiReputationNft[]>([]);
  const [profileDraft, setProfileDraft] = useState({
    username: '',
    about: '',
    specialty: '',
    hourlyRate: '',
    company: '',
    skills: [] as string[],
    portfolio: [] as string[],
  });
  
  // New profile fields
  const [language, setLanguage] = useState('English');
  const [country, setCountry] = useState('USA');
  const [city, setCity] = useState('San Francisco');
  
  // Image editing modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<'profile' | 'cover' | null>(null);
  const [profileImage, setProfileImage] = useState(userRole === 'client' ? "https://picsum.photos/seed/client/300/300" : "https://picsum.photos/seed/elodie/300/300");
  const [coverImage, setCoverImage] = useState("https://picsum.photos/seed/banner/1920/600");

  const openImageEditor = (type: 'profile' | 'cover') => {
    setImageToEdit(type);
    setIsImageModalOpen(true);
  };

  const handleImageSave = () => {
    // In a real app, this would handle the cropped/reframed image
    // For now, we'll just close the modal
    setIsImageModalOpen(false);
    setImageToEdit(null);
  };

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const [profileResponse, projectResponse, reviewResponse, socialResponse, connectionResponse, suggestionResponse, bountyResponse, nftResponse] = await Promise.all([
          getUserProfile(walletAddress),
          getUserProjects(walletAddress),
          getUserReviews(walletAddress).catch(() => []),
          getSocialPosts(walletAddress).catch(() => []),
          getConnections().catch(() => []),
          getConnectionSuggestions().catch(() => []),
          getMyBountyDashboard().catch(() => null),
          getUserNfts(walletAddress).catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(profileResponse);
        setProjects(projectResponse);
        setReviews(reviewResponse);
        setTimelinePosts(socialResponse);
        setConnections(connectionResponse);
        setConnectionSuggestions(suggestionResponse);
        setBountyDashboard(bountyResponse);
        setNfts(nftResponse);
        setProfileDraft({
          username: profileResponse.username || '',
          about: profileResponse.about || '',
          specialty: profileResponse.specialty || '',
          hourlyRate: profileResponse.hourlyRate || '',
          company: profileResponse.company || '',
          skills: profileResponse.skills || [],
          portfolio: profileResponse.portfolio || [],
        });
        if (profileResponse.avatar) {
          setProfileImage(profileResponse.avatar);
        }
        setPortfolioLinks(
          (profileResponse.portfolio || []).map((url, index) => ({
            id: Date.now() + index,
            title: new URL(url).hostname.replace('www.', ''),
            url,
            icon: <Globe size={16} />,
          })),
        );
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  const [experiences, setExperiences] = useState([
    { id: 1, role: 'Senior Product Designer', company: 'STXWORX', period: '2021 - Present', desc: 'Leading the design system and core product features.' },
    { id: 2, role: 'UI Designer', company: 'Creative Agency', period: '2018 - 2021', desc: 'Worked on various client projects from fintech to e-commerce.' },
  ]);

  const [portfolioLinks, setPortfolioLinks] = useState<{ id: number; title: string; url: string; icon: React.ReactNode }[]>([]);
  const [newPostText, setNewPostText] = useState('');

  const handleAddExperience = () => {
    setExperiences([...experiences, { id: Date.now(), role: '', company: '', period: '', desc: '' }]);
  };

  const handleRemoveExperience = (id: number) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
  };

  const handleAddLink = () => {
    setPortfolioLinks([...portfolioLinks, { id: Date.now(), title: '', url: '', icon: <Globe size={16} /> }]);
  };

  const handleRemoveLink = (id: number) => {
    setPortfolioLinks(portfolioLinks.filter(link => link.id !== id));
  };

  const handlePostTimeline = async () => {
    if (!newPostText.trim()) {
      return;
    }

    try {
      const created = await createSocialPost({ content: newPostText.trim() });
      setTimelinePosts((current) => [
        {
          ...created,
          likesCount: 0,
          commentsCount: 0,
          likedByViewer: false,
        },
        ...current,
      ]);
      setNewPostText('');
    } catch (error) {
      console.error('Failed to create timeline post:', error);
    }
  };

  const handleToggleTimelineLike = async (postId: number) => {
    try {
      const response = await toggleSocialPostLike(postId);
      setTimelinePosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: response.likesCount,
                likedByViewer: response.likedByViewer,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle post like:', error);
    }
  };

  const handleRequestConnection = async (userId: number) => {
    try {
      await requestConnection(userId);
      setConnectionSuggestions((current) => current.filter((entry) => entry.id !== userId));
      const refreshed = await getConnections();
      setConnections(refreshed);
    } catch (error) {
      console.error('Failed to request connection:', error);
    }
  };

  const handleRespondToConnection = async (connectionId: number, action: 'accept' | 'decline') => {
    try {
      const updated = action === 'accept'
        ? await acceptConnection(connectionId)
        : await declineConnection(connectionId);

      setConnections((current) =>
        current.map((connection) => (connection.id === updated.id ? { ...connection, status: updated.status } : connection)),
      );
    } catch (error) {
      console.error('Failed to update connection:', error);
    }
  };

  const resolvedRole = profile?.role || userRole;
  const isClient = resolvedRole === 'client';
  const displayName = profileDraft.username || profile?.username || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : isClient ? 'Client Profile' : 'Freelancer Profile');
  const displayHandle = profileDraft.username
    ? `@${profileDraft.username.toLowerCase().replace(/\s+/g, '')}`
    : walletAddress
      ? `@${walletAddress.slice(0, 8).toLowerCase()}`
      : '@stxworx';
  const averageRating = useMemo(
    () => (reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '0.0'),
    [reviews],
  );
  const totalBudget = useMemo(
    () => projects.reduce((sum, project) => sum + Number(project.budget || 0), 0),
    [projects],
  );
  const recentProjects = useMemo(
    () => [...projects].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()),
    [projects],
  );
  const websiteLink = portfolioLinks[0]?.url || profile?.portfolio?.[0] || '';
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';
  const displaySkills = profileDraft.skills.length ? profileDraft.skills : profile?.skills || [];
  const displaySpecialty = profileDraft.specialty || profile?.specialty || (isClient ? 'Decentralized Finance' : 'Freelancer');
  const websiteHref = websiteLink ? (websiteLink.startsWith('http') ? websiteLink : `https://${websiteLink}`) : '#';
  const acceptedConnections = connections.filter((connection) => connection.status === 'accepted');
  const incomingConnectionRequests = connections.filter((connection) => connection.status === 'pending' && connection.direction === 'incoming');
  const outgoingConnectionRequests = connections.filter((connection) => connection.status === 'pending' && connection.direction === 'outgoing');

  const handleSaveProfile = async () => {
    if (!walletAddress) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateMyProfile({
        username: profileDraft.username || undefined,
        about: profileDraft.about || undefined,
        specialty: profileDraft.specialty || undefined,
        hourlyRate: profileDraft.hourlyRate || undefined,
        company: profileDraft.company || undefined,
        skills: profileDraft.skills.filter(Boolean),
        portfolio: portfolioLinks.map((link) => {
          const url = link.url.trim();
          return url.startsWith('http') ? url : `https://${url}`;
        }).filter(Boolean),
        avatar: profileImage || undefined,
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      handleSaveProfile();
      return;
    }

    setIsEditing(true);
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <Shared.MessageModal 
          isOpen={isMessageModalOpen} 
          onClose={() => setIsMessageModalOpen(false)} 
          recipientAddress={recipientAddress}
        />  
        
        {/* Image Editor Modal */}
        <AnimatePresence>
          {isImageModalOpen && (
            <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-[15px] p-6 max-w-2xl w-full shadow-2xl relative"
              >
                <button 
                  onClick={() => setIsImageModalOpen(false)}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">Update {imageToEdit === 'profile' ? 'Profile Picture' : 'Cover Image'}</h3>
                
                <div className="bg-ink/5 border border-border rounded-[15px] p-8 mb-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  {/* Simulated Cropper Area */}
                  <img 
                    src={imageToEdit === 'profile' ? profileImage : coverImage} 
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    alt="Original"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute border-2 border-accent-orange shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ${imageToEdit === 'profile' ? 'w-48 h-48 rounded-full' : 'w-full h-32'}`}>
                    <img 
                      src={imageToEdit === 'profile' ? profileImage : coverImage} 
                      className="w-full h-full object-cover"
                      alt="Cropped"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg/80 backdrop-blur-md px-4 py-2 rounded-[15px] text-xs font-bold flex items-center gap-4">
                    <button className="hover:text-accent-orange"><ZoomIn size={16} /></button>
                    <input type="range" className="w-24 accent-accent-orange" />
                    <button className="hover:text-accent-orange"><ZoomOut size={16} /></button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button className="btn-outline py-2 px-4 text-sm flex items-center gap-2">
                    <Upload size={16} /> Upload New
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setIsImageModalOpen(false)} className="px-4 py-2 rounded-[15px] text-sm font-bold text-muted hover:text-ink transition-colors">Cancel</button>
                    <button onClick={handleImageSave} className="btn-primary py-2 px-6 text-sm">Save Image</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Header */}
        <section className="mb-10">
          {/* Cover Image */}
          <div className="relative h-48 md:h-64 rounded-[15px] overflow-hidden mb-6 group">
            <img 
              src={coverImage} 
              className="w-full h-full object-cover" 
              alt="Banner"
              referrerPolicy="no-referrer"
            />
            {isEditing && (
              <button 
                onClick={() => openImageEditor('cover')}
                className="absolute top-4 right-4 bg-bg/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-accent-orange transition-colors"
              >
                <Camera size={20} />
              </button>
            )}
          </div>

          {/* Profile Info Box */}
          <div className="card p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              {/* Avatar */}
              <div className="relative group/avatar shrink-0">
                <img 
                  src={profileImage} 
                  className="w-32 h-32 md:w-40 md:h-40 rounded-[10px] object-cover" 
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-accent-cyan border-4 border-bg rounded-full"></div>
                {isEditing && (
                  <button 
                    onClick={() => openImageEditor('profile')}
                    className="absolute inset-0 m-auto w-10 h-10 bg-bg/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-accent-orange transition-colors"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={profileDraft.username}
                            onChange={(e) => setProfileDraft((current) => ({ ...current, username: e.target.value }))}
                            className="text-3xl md:text-4xl font-black tracking-tighter bg-ink/5 border border-border rounded-[10px] px-3 py-1 outline-none focus:border-accent-orange"
                            placeholder="Nick Name"
                          />
                          <input
                            type="text"
                            value={displayHandle}
                            readOnly
                            className="text-sm font-bold text-muted bg-ink/5 border border-border rounded-[10px] px-3 py-1 outline-none"
                            placeholder="@username"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
                              {displayName}
                            </h1>
                            {/* X Verified Badge */}
                            <div className="flex items-center justify-center w-5 h-5 bg-black text-white rounded-full" title="X Verified">
                              <Twitter size={10} fill="currentColor" />
                            </div>
                            <CheckCircle2 size={24} className="text-accent-blue fill-accent-blue/20" />
                          </div>
                          <p className="text-sm font-bold text-muted mt-1">{displayHandle}</p>
                          <p className="text-xs text-muted mt-1">{displaySpecialty}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted mt-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 w-full max-w-md">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="shrink-0" />
                            <div className="flex gap-2 w-full">
                              <input 
                                type="text" 
                                value={city} 
                                onChange={(e) => setCity(e.target.value)}
                                className="w-1/2 bg-ink/5 border border-border rounded-[5px] px-2 py-1 text-xs outline-none focus:border-accent-orange" 
                                placeholder="City" 
                              />
                              <input 
                                type="text" 
                                value={country} 
                                onChange={(e) => setCountry(e.target.value)}
                                className="w-1/2 bg-ink/5 border border-border rounded-[5px] px-2 py-1 text-xs outline-none focus:border-accent-orange" 
                                placeholder="Country" 
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="shrink-0" />
                            <input 
                              type="text" 
                              value={language} 
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full bg-ink/5 border border-border rounded-[5px] px-2 py-1 text-xs outline-none focus:border-accent-orange" 
                              placeholder="Language" 
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <LinkIcon size={14} className="shrink-0" />
                            <input type="text" value={websiteLink} readOnly className="w-full bg-ink/5 border border-border rounded-[5px] px-2 py-1 text-xs outline-none" placeholder="Website" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {city}, {country}</span>
                          <span className="flex items-center gap-1"><Globe size={14} /> {language}</span>
                          <span className="flex items-center gap-1"><LinkIcon size={14} /> {websiteLink || 'No website yet'}</span>
                          <div className="flex gap-3 ml-2">
                            <Twitter size={14} className="hover:text-accent-orange cursor-pointer" />
                            <Instagram size={14} className="hover:text-accent-orange cursor-pointer" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 md:gap-4">
                    <button onClick={handleEditToggle} className="btn-outline flex items-center gap-2">
                      <Edit2 size={16} /> {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit Profile'}
                    </button>
                    {!isEditing && (
                      <>
                        <button className="btn-primary hidden md:block">Follow</button>
                        <button className="p-3 rounded-[15px] border border-border hover:bg-ink/10 transition-colors">
                          <MessageSquare size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reputation NFTs */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Reputation NFTs</p>
                    <div className="group relative cursor-pointer">
                      <HelpCircle size={12} className="text-muted" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-ink text-bg text-[10px] rounded-[15px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                        Reputation NFTs are earned by completing jobs and maintaining high ratings.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pb-2">
                    {[
                      { tier: 'Verified', letter: 'V', color: 'bg-green-500', earned: true },
                      { tier: 'Bronze', letter: 'B', color: 'bg-[#cd7f32]', earned: true },
                      { tier: 'Silver', letter: 'S', color: 'bg-[#C0C0C0]', earned: true },
                      { tier: 'Gold', letter: 'G', color: 'bg-[#FFD700]', earned: false },
                      { tier: 'Platinum', letter: 'P', color: 'bg-[#E5E4E2]', earned: false },
                    ].map((nft, i) => (
                      <div 
                        key={i} 
                        className={`w-6 h-6 flex items-center justify-center rounded-sm font-bold text-[10px] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.4)] relative group cursor-pointer ${nft.earned ? nft.color : 'bg-ink/10 text-muted shadow-none'}`}
                      >
                        {nft.letter}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-bg text-[10px] rounded-[15px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                          {nft.tier} Status {nft.earned ? '' : '(Not Earned)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-10 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 md:px-8 py-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-accent-orange' : 'text-muted hover:text-ink'}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-accent-orange" />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-10">
            {activeTab === 'Profile' && (
              <>
                <div className="card">
                  <h2 className="text-xl font-black mb-6">About {isClient ? 'Company' : 'Freelancer'}</h2>
                  {isEditing ? (
                    <textarea 
                      className="w-full bg-ink/5 border border-border rounded-[15px] p-4 text-sm focus:ring-1 focus:ring-accent-orange min-h-[120px]"
                      value={profileDraft.about}
                      onChange={(e) => setProfileDraft((current) => ({ ...current, about: e.target.value }))}
                    />
                  ) : (
                    <p className="text-muted leading-relaxed mb-8">
                      {profile?.about || (isClient ? "This client has not added a company overview yet." : "This freelancer has not added an about section yet.")}
                    </p>
                  )}
                  
                  {!isClient ? (
                    <>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-accent-orange mb-4">Instruments</h3>
                      <div className="flex flex-wrap gap-3">
                        {displaySkills.map(tool => (
                          <span key={tool} className="px-4 py-2 bg-ink/5 rounded-full text-xs font-bold border border-border">{tool}</span>
                        ))}
                        {displaySkills.length === 0 && <span className="text-xs text-muted">No skills added yet.</span>}
                      </div>
                      {isEditing && (
                        <input
                          type="text"
                          value={profileDraft.skills.join(', ')}
                          onChange={(e) =>
                            setProfileDraft((current) => ({
                              ...current,
                              skills: e.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                            }))
                          }
                          className="w-full mt-4 bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none focus:border-accent-orange"
                          placeholder="Add skills separated by commas"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-accent-blue mb-4">Company Details</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-muted mb-1">Industry</p>
                          <p className="font-bold text-sm">{displaySpecialty}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Company Size</p>
                          <p className="font-bold text-sm">{projects.length} active listings</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Founded</p>
                          <p className="font-bold text-sm">{joinedDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Website</p>
                          <a href={websiteHref} className="font-bold text-sm text-accent-cyan hover:underline">{websiteLink || 'Not added yet'}</a>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!isClient ? (
                  <>
                    <div className="card mb-10">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black">Work & Experience</h2>
                        {isEditing && <button onClick={handleAddExperience} className="text-xs font-bold text-accent-orange hover:underline flex items-center gap-1"><Plus size={14} /> Add Experience</button>}
                      </div>
                      <div className="space-y-8">
                        {experiences.map((exp, i) => (
                          <div key={exp.id} className="flex gap-6 relative">
                            <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full bg-accent-orange border-4 border-bg"></div>
                              {i !== experiences.length - 1 && <div className="w-[2px] h-full bg-border mt-2"></div>}
                            </div>
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-3 bg-ink/5 p-4 rounded-[15px] border border-border relative">
                                  <input type="text" defaultValue={exp.role} onChange={(e) => {
                                    const newExp = [...experiences];
                                    newExp[i].role = e.target.value;
                                    setExperiences(newExp);
                                  }} className="w-full bg-transparent border-b border-border pb-1 text-sm font-bold outline-none focus:border-accent-orange pr-8" placeholder="Role" />
                                  <div className="flex gap-4">
                                    <input type="text" defaultValue={exp.company} onChange={(e) => {
                                      const newExp = [...experiences];
                                      newExp[i].company = e.target.value;
                                      setExperiences(newExp);
                                    }} className="w-full bg-transparent border-b border-border pb-1 text-xs text-accent-red outline-none focus:border-accent-orange" placeholder="Company" />
                                    <input type="text" defaultValue={exp.period} onChange={(e) => {
                                      const newExp = [...experiences];
                                      newExp[i].period = e.target.value;
                                      setExperiences(newExp);
                                    }} className="w-full bg-transparent border-b border-border pb-1 text-xs text-accent-red outline-none focus:border-accent-orange" placeholder="Period" />
                                  </div>
                                  <textarea defaultValue={exp.desc} onChange={(e) => {
                                    const newExp = [...experiences];
                                    newExp[i].desc = e.target.value;
                                    setExperiences(newExp);
                                  }} className="w-full bg-transparent border-b border-border pb-1 text-xs text-muted outline-none focus:border-accent-orange min-h-[60px]" placeholder="Description"></textarea>
                                  <button onClick={() => handleRemoveExperience(exp.id)} className="absolute top-4 right-4 text-muted hover:text-accent-red"><X size={16} /></button>
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-bold text-sm">{exp.role}</h4>
                                  <p className="text-xs text-accent-red mb-2">{exp.company} • {exp.period}</p>
                                  <p className="text-xs text-muted leading-relaxed">{exp.desc}</p>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black">Portfolio Links</h2>
                        {isEditing && <button onClick={handleAddLink} className="text-xs font-bold text-accent-orange hover:underline flex items-center gap-1"><Plus size={14} /> Add Link</button>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {portfolioLinks.map((link, i) => (
                          <div key={link.id} className="flex items-center gap-3 p-4 border border-border rounded-[15px] bg-ink/5 hover:bg-ink/10 transition-colors relative">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted shrink-0">
                              {link.icon}
                            </div>
                            <div className="flex-1 overflow-hidden pr-6">
                              {isEditing ? (
                                <div className="flex flex-col gap-1">
                                  <input type="text" defaultValue={link.title} onChange={(e) => {
                                    const newLinks = [...portfolioLinks];
                                    newLinks[i].title = e.target.value;
                                    setPortfolioLinks(newLinks);
                                  }} className="w-full bg-transparent border-b border-border text-sm font-bold outline-none focus:border-accent-orange" placeholder="Title" />
                                  <input type="text" defaultValue={link.url} onChange={(e) => {
                                    const newLinks = [...portfolioLinks];
                                    newLinks[i].url = e.target.value;
                                    setPortfolioLinks(newLinks);
                                  }} className="w-full bg-transparent border-b border-border text-xs text-muted outline-none focus:border-accent-orange" placeholder="URL" />
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-bold text-sm truncate">{link.title}</h4>
                                  <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-xs text-accent-cyan hover:underline truncate block">{link.url}</a>
                                </>
                              )}
                            </div>
                            {isEditing && (
                              <button onClick={() => handleRemoveLink(link.id)} className="absolute top-1/2 -translate-y-1/2 right-4 text-muted hover:text-accent-red shrink-0"><X size={16} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black">Active Projects</h2>
                      <button className="text-accent-blue text-xs font-bold hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {recentProjects.slice(0, 4).map((project) => (
                        <div key={project.id} className="p-4 border border-border rounded-[15px] flex items-center justify-between hover:bg-ink/5 transition-colors cursor-pointer">
                          <div>
                            <h4 className="font-bold text-sm mb-1">{project.title}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${project.status === 'open' ? 'text-accent-cyan' : 'text-accent-orange'}`}>{project.status}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                            <p className="text-xs text-muted">Budget</p>
                          </div>
                        </div>
                      ))}
                      {recentProjects.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black">{isClient ? 'Active Jobs' : 'Portfolio'}</h2>
                    {isClient ? (
                      <Link to="/dashboard" className="text-accent-orange text-xs font-bold hover:underline">View All</Link>
                    ) : (
                      <button className="text-accent-orange text-xs font-bold">View All</button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {recentProjects.slice(0, 4).map((project) => (
                      <div key={project.id} className="p-4 border border-border rounded-[15px] flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">{formatRelativeTime(project.createdAt)} • {project.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                          <p className="text-xs text-muted">Budget</p>
                        </div>
                      </div>
                    ))}
                    {recentProjects.length === 0 && <p className="text-sm text-muted">No projects available yet.</p>}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Timeline' && (
              <div className="space-y-6">
                <div className="card p-4 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-[10px] bg-ink/10 shrink-0 overflow-hidden">
                    <img src={profileImage} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                  </div>
                  <input 
                    type="text" 
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="What's on your mind?" 
                    className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none" 
                    onKeyDown={(e) => e.key === 'Enter' && handlePostTimeline()}
                  />
                  <button onClick={handlePostTimeline} className="btn-primary py-2 px-4 shrink-0"><Send size={16} /></button>
                </div>
                
                {timelinePosts.map((post) => (
                  <div key={post.id} className="card p-6 hover:border-accent-orange transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img src={profileImage} className="w-10 h-10 rounded-[10px] object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-sm">{displayName}</h4>
                          <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                      </div>
                      <button className="text-muted hover:text-ink"><MoreHorizontal size={16} /></button>
                    </div>
                    <Link to={`/post/${post.id}`} className="block group">
                      <p className="text-sm mb-4 group-hover:text-accent-orange transition-colors">{post.content}</p>
                      {post.imageUrl && (
                        <img src={post.imageUrl} className="w-full rounded-[15px] mb-4 object-cover max-h-64" alt="Post content" referrerPolicy="no-referrer" />
                      )}
                    </Link>
                    <div className="flex items-center gap-6 text-muted border-t border-border pt-4">
                      <button onClick={() => handleToggleTimelineLike(post.id)} className={`flex items-center gap-2 text-xs font-bold transition-colors ${post.likedByViewer ? 'text-accent-red' : 'hover:text-accent-red'}`}><Heart size={16} /> {post.likesCount}</button>
                      <Link to={`/post/${post.id}`} className="flex items-center gap-2 text-xs font-bold hover:text-accent-blue transition-colors"><MessageCircle size={16} /> {post.commentsCount}</Link>
                      <button className="flex items-center gap-2 text-xs font-bold hover:text-accent-orange transition-colors ml-auto"><Share2 size={16} /> Share</button>
                    </div>
                  </div>
                ))}
                {timelinePosts.length === 0 && (
                  <div className="card p-6 text-sm text-muted">No timeline posts yet.</div>
                )}
              </div>
            )}

            {activeTab === 'NFTs' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {nfts.map((nft) => (
                  <div key={nft.id} className="card p-4 text-center group">
                    <div className="aspect-square rounded-[15px] overflow-hidden mb-4 relative bg-gradient-to-br from-accent-orange/20 via-accent-cyan/10 to-accent-pink/10 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-ink text-bg flex items-center justify-center text-3xl font-black uppercase">
                        {nft.name.slice(0, 1)}
                      </div>
                      <div className="absolute bottom-3 left-3 text-left">
                        <p className="text-xs font-black">{nft.name}</p>
                        <p className="text-[10px] text-muted">{formatRelativeTime(nft.createdAt)}</p>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm">{nft.name}</h4>
                    <p className="text-[10px] text-muted uppercase tracking-widest mt-1">{nft.nftType.replace(/_/g, ' ')}</p>
                    <p className={`text-[10px] font-bold mt-2 ${nft.minted ? 'text-accent-cyan' : 'text-muted'}`}>{nft.minted ? 'Mint confirmed' : 'Awaiting mint confirmation'}</p>
                  </div>
                ))}
                {nfts.length === 0 && (
                  <div className="card p-6 text-sm text-muted col-span-2 md:col-span-3">No reputation NFTs awarded yet.</div>
                )}
              </div>
            )}

            {activeTab === 'Bounties' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Posted Bounties</h3>
                    <div className="space-y-4">
                      {bountyDashboard?.posted.map((bounty) => (
                        <div key={bounty.id} className="border border-border rounded-[15px] p-4">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h4 className="font-bold text-sm">{bounty.title}</h4>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-accent-orange">{bounty.status}</span>
                          </div>
                          <p className="text-xs text-muted mb-2">{bounty.reward}</p>
                          <p className="text-[10px] text-muted">{bounty.submissionCount} submissions</p>
                        </div>
                      ))}
                      {(!bountyDashboard || bountyDashboard.posted.length === 0) && <p className="text-sm text-muted">You have not posted any bounties yet.</p>}
                    </div>
                  </div>
                  <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Your Participations</h3>
                    <div className="space-y-4">
                      {bountyDashboard?.participations.map((participation) => (
                        <div key={participation.id} className="border border-border rounded-[15px] p-4">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h4 className="font-bold text-sm">{participation.bountyTitle || `Bounty #${participation.bountyId}`}</h4>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-accent-cyan">{participation.status}</span>
                          </div>
                          <p className="text-xs text-muted">{participation.reward || 'Reward pending'}</p>
                        </div>
                      ))}
                      {(!bountyDashboard || bountyDashboard.participations.length === 0) && <p className="text-sm text-muted">You have not joined any bounties yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Friends' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-4">Connections</h3>
                  <div className="space-y-4">
                    {acceptedConnections.map((connection) => (
                      <div key={connection.id} className="border border-border rounded-[15px] p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm">{connection.otherUser?.username || connection.otherUser?.stxAddress || 'Connection'}</p>
                          <p className="text-[10px] text-muted uppercase tracking-widest">{connection.otherUser?.role || 'User'}</p>
                        </div>
                        <span className="text-xs font-bold text-accent-cyan">Connected</span>
                      </div>
                    ))}
                    {acceptedConnections.length === 0 && <p className="text-sm text-muted">No accepted connections yet.</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Incoming Requests</h3>
                    <div className="space-y-4">
                      {incomingConnectionRequests.map((connection) => (
                        <div key={connection.id} className="border border-border rounded-[15px] p-4">
                          <p className="font-bold text-sm mb-1">{connection.otherUser?.username || connection.otherUser?.stxAddress || 'User'}</p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleRespondToConnection(connection.id, 'accept')} className="btn-primary py-2 px-4 text-xs">Accept</button>
                            <button onClick={() => handleRespondToConnection(connection.id, 'decline')} className="btn-outline py-2 px-4 text-xs">Decline</button>
                          </div>
                        </div>
                      ))}
                      {incomingConnectionRequests.length === 0 && <p className="text-sm text-muted">No incoming requests.</p>}
                    </div>
                  </div>
                  <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Suggested Connections</h3>
                    <div className="space-y-4">
                      {connectionSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="border border-border rounded-[15px] p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-sm">{suggestion.username || suggestion.stxAddress}</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">{suggestion.specialty || suggestion.role}</p>
                          </div>
                          <button onClick={() => handleRequestConnection(suggestion.id)} className="btn-outline py-2 px-4 text-xs">Connect</button>
                        </div>
                      ))}
                      {connectionSuggestions.length === 0 && <p className="text-sm text-muted">No suggestions right now.</p>}
                    </div>
                  </div>
                </div>

                {outgoingConnectionRequests.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Pending Requests</h3>
                    <div className="space-y-4">
                      {outgoingConnectionRequests.map((connection) => (
                        <div key={connection.id} className="border border-border rounded-[15px] p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-sm">{connection.otherUser?.username || connection.otherUser?.stxAddress || 'User'}</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">{connection.otherUser?.role || 'User'}</p>
                          </div>
                          <span className="text-xs font-bold text-muted">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`card ${isClient ? 'bg-accent-blue' : 'bg-accent-orange'} text-bg`}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-2xl font-black">{isClient ? `${formatTokenAmount(totalBudget)}` : profile?.hourlyRate ? `${profile.hourlyRate}` : `${formatTokenAmount(profile?.totalEarned)}`}</p>
                <p className="text-xs font-bold opacity-60">{isClient ? 'Total Budget' : profile?.hourlyRate ? 'per hour' : 'Total Earned'}</p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">Location</span>
                  <span>{city}, {country}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">{isClient ? 'Jobs Posted' : 'Projects'}</span>
                  <span>{projects.length}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">{isClient ? 'Member Since' : 'Rating'}</span>
                  <span>{isClient ? joinedDate : averageRating}</span>
                </div>
              </div>
              {!isEditing && (
                isClient ? (
                  <button className="w-full bg-bg text-white py-4 rounded-[15px] font-bold hover:bg-white hover:text-bg transition-all flex items-center justify-center">
                    Share Profile
                  </button>
                ) : (
                  <button className="w-full bg-bg text-white py-4 rounded-[15px] font-bold hover:bg-white hover:text-bg transition-all">
                    Edit Profile
                  </button>
                )
              )}
            </div>

            <div className="card">
              <h3 className="font-bold text-sm mb-6 flex items-center justify-between">
                Recent Reviews <MoreHorizontal size={16} className="text-muted" />
              </h3>
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-[15px] bg-ink/10 flex items-center justify-center font-black text-[10px]">
                      {review.rating}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{review.comment || 'No written feedback provided.'}</p>
                      <p className="text-[10px] text-muted">{formatRelativeTime(review.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
