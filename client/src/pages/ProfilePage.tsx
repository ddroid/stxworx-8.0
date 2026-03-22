import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Bell, Globe, LayoutGrid, Users, BookOpen, Briefcase, Calendar, ShoppingBag, Newspaper,
  ChevronRight, Star, Plus, Heart, MessageSquare, Share2, MapPin, Link as LinkIcon, Twitter, Instagram,
  Facebook, MoreHorizontal, ArrowRight, Filter, Trophy, ChevronLeft, ChevronsRight, ChevronDown,
  Wallet, Send, X, Settings, ShieldCheck, LogOut, Mail, Phone, MessageCircle, Sun, Moon, Maximize2, Minimize2,
  HelpCircle, AlertTriangle, Folder, GraduationCap, Home, PenTool, Camera, Edit2, Share, Shield, Upload, FileText,
  Download, Sparkles, Bot, ZoomIn, ZoomOut
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as Shared from '../shared';
import {
  acceptConnection,
  checkUsernameAvailability,
  createSocialPost,
  declineConnection,
  formatRelativeTime,
  formatTokenAmount,
  getConnectionSuggestions,
  getConnections,
  getMyBountyDashboard,
  getSocialPosts,
  toDisplayName,
  toApiAssetUrl,
  getUserProfile,
  getUserProfileByUsername,
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
import type { ApiUserProfile, ApiUserReview, UserRole } from '../types/user';

type LinkTypeValue = 'website' | 'github' | 'linkedin' | 'twitter' | 'instagram' | 'custom';

type PortfolioLinkDraft = {
  id: number;
  type: LinkTypeValue;
  url: string;
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const linkTypeOptions: Array<{ value: LinkTypeValue; label: string }> = [
  { value: 'website', label: 'Website' },
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'custom', label: 'Custom' },
];

function normalizeUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

function inferLinkType(url: string): LinkTypeValue {
  const normalized = url.toLowerCase();

  if (normalized.includes('github.com')) {
    return 'github';
  }

  if (normalized.includes('linkedin.com')) {
    return 'linkedin';
  }

  if (normalized.includes('twitter.com') || normalized.includes('x.com')) {
    return 'twitter';
  }

  if (normalized.includes('instagram.com')) {
    return 'instagram';
  }

  return 'website';
}

function parsePortfolioLinks(links?: string[] | null): PortfolioLinkDraft[] {
  return (links || []).map((url, index) => ({
    id: Date.now() + index,
    type: inferLinkType(url),
    url,
  }));
}

function imageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(typeof fileReader.result === 'string' ? fileReader.result : '');
    fileReader.onerror = () => reject(fileReader.error || new Error('Failed to read image file'));
    fileReader.readAsDataURL(file);
  });
}

function fallbackAvatar(role: UserRole | null | undefined) {
  return role === 'client' ? 'https://picsum.photos/seed/client/300/300' : 'https://picsum.photos/seed/elodie/300/300';
}

function fallbackCover() {
  return 'https://picsum.photos/seed/banner/1920/600';
}

export const ProfilePage = ({ userRole }: { userRole: UserRole | null }) => {
  const { walletAddress, isSignedIn } = Shared.useWallet();
  const { walletAddressParam, profileIdentifier } = useParams<{ walletAddressParam?: string; profileIdentifier?: string }>();
  const tabs = ['Timeline', 'Profile', 'Bounties', 'Friends', 'NFTs'];
  const [activeTab, setActiveTab] = useState('Profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [reviews, setReviews] = useState<ApiUserReview[]>([]);
  const [timelinePosts, setTimelinePosts] = useState<ApiSocialPost[]>([]);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState<Array<Pick<ApiUserProfile, 'id' | 'stxAddress' | 'name' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'>>>([]);
  const [bountyDashboard, setBountyDashboard] = useState<ApiBountyDashboard | null>(null);
  const [nfts, setNfts] = useState<ApiReputationNft[]>([]);
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    username: '',
    about: '',
    specialty: '',
    hourlyRate: '',
    company: '',
    skills: [] as string[],
    portfolio: [] as string[],
  });
  
  // New profile fields
  const [language, setLanguage] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  
  // Image editing modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<'profile' | 'cover' | null>(null);
  const [profileImage, setProfileImage] = useState(fallbackAvatar(userRole));
  const [coverImage, setCoverImage] = useState(fallbackCover());
  const [pendingImage, setPendingImage] = useState('');
  const [imageZoom, setImageZoom] = useState(1);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const timelineImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const skillInputRef = React.useRef<HTMLInputElement | null>(null);

  const profilePathMode = walletAddressParam ? 'wallet' : profileIdentifier ? 'username' : 'me';

  const openImageEditor = (type: 'profile' | 'cover') => {
    setImageToEdit(type);
    setPendingImage(type === 'profile' ? profileImage : coverImage);
    setImageZoom(1);
    setIsImageModalOpen(true);
  };

  const closeImageEditor = () => {
    setIsImageModalOpen(false);
    setImageToEdit(null);
    setPendingImage('');
    setImageZoom(1);
  };

  const handleImageSave = () => {
    if (!pendingImage || !imageToEdit) {
      closeImageEditor();
      return;
    }

    if (imageToEdit === 'profile') {
      setProfileImage(pendingImage);
    } else {
      setCoverImage(pendingImage);
    }

    closeImageEditor();
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        let profileResponse: ApiUserProfile;

        if (profilePathMode === 'wallet' && walletAddressParam) {
          profileResponse = await getUserProfile(walletAddressParam);
        } else if (profilePathMode === 'username' && profileIdentifier) {
          profileResponse = await getUserProfileByUsername(profileIdentifier);
        } else if (walletAddress) {
          profileResponse = await getUserProfile(walletAddress);
        } else {
          if (!isMounted) {
            return;
          }

          setProfile(null);
          setProjects([]);
          setReviews([]);
          setTimelinePosts([]);
          setConnections([]);
          setConnectionSuggestions([]);
          setBountyDashboard(null);
          setNfts([]);
          setIsLoading(false);
          return;
        }

        if (!profileResponse?.stxAddress) {
          throw new Error('Profile not found');
        }

        if (profilePathMode !== 'me' && profileResponse.id === 0) {
          throw new Error('User not found');
        }

        const [projectResponse, reviewResponse, socialResponse, nftResponse, connectionResponse, suggestionResponse, bountyResponse] = await Promise.all([
          getUserProjects(profileResponse.stxAddress).catch(() => []),
          getUserReviews(profileResponse.stxAddress).catch(() => []),
          getSocialPosts(profileResponse.stxAddress).catch(() => []),
          getUserNfts(profileResponse.stxAddress).catch(() => []),
          isSignedIn ? getConnections().catch(() => []) : Promise.resolve([]),
          isSignedIn && walletAddress === profileResponse.stxAddress ? getConnectionSuggestions().catch(() => []) : Promise.resolve([]),
          isSignedIn && walletAddress === profileResponse.stxAddress ? getMyBountyDashboard().catch(() => null) : Promise.resolve(null),
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
          name: profileResponse.name || '',
          username: profileResponse.username || '',
          about: profileResponse.about || '',
          specialty: profileResponse.specialty || '',
          hourlyRate: profileResponse.hourlyRate || '',
          company: profileResponse.company || '',
          skills: profileResponse.skills || [],
          portfolio: profileResponse.portfolio || [],
        });
        setCity(profileResponse.city || '');
        setCountry(profileResponse.country || '');
        setLanguage(profileResponse.language || '');
        setProfileImage(profileResponse.avatar || fallbackAvatar(profileResponse.role));
        setCoverImage(profileResponse.coverImage || fallbackCover());
        setPortfolioLinks(parsePortfolioLinks(profileResponse.portfolio));
        setUsernameStatus('idle');
        setUsernameMessage('');
        setGlobalError('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : 'Failed to load profile');
        setProfile(null);
        setProjects([]);
        setReviews([]);
        setTimelinePosts([]);
        setConnections([]);
        setConnectionSuggestions([]);
        setBountyDashboard(null);
        setNfts([]);
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
  }, [walletAddress, walletAddressParam, profileIdentifier, profilePathMode, isSignedIn]);

  const [experiences, setExperiences] = useState([
    { id: 1, role: 'Senior Product Designer', company: 'STXWORX', period: '2021 - Present', desc: 'Leading the design system and core product features.' },
    { id: 2, role: 'UI Designer', company: 'Creative Agency', period: '2018 - 2021', desc: 'Worked on various client projects from fintech to e-commerce.' },
  ]);

  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLinkDraft[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImageDataUrl, setNewPostImageDataUrl] = useState('');
  const [newPostImageName, setNewPostImageName] = useState('');
  const [isPostingTimeline, setIsPostingTimeline] = useState(false);

  const handleAddExperience = () => {
    setExperiences([...experiences, { id: Date.now(), role: '', company: '', period: '', desc: '' }]);
  };

  const handleRemoveExperience = (id: number) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
  };

  const handleAddLink = () => {
    setPortfolioLinks([...portfolioLinks, { id: Date.now(), type: 'website', url: '' }]);
  };

  const handleRemoveLink = (id: number) => {
    setPortfolioLinks(portfolioLinks.filter(link => link.id !== id));
  };

  const handleWebsiteChange = (value: string) => {
    setPortfolioLinks((current) => {
      if (current.length === 0) {
        return [{ id: Date.now(), type: 'website', url: value }];
      }

      return current.map((entry, index) =>
        index === 0
          ? { ...entry, type: 'website', url: value }
          : entry,
      );
    });
  };

  const handleTimelineImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setGlobalError('Please select an image file.');
      return;
    }

    try {
      const dataUrl = await imageToDataUrl(file);

      if (!dataUrl) {
        return;
      }

      setNewPostImageDataUrl(dataUrl);
      setNewPostImageName(file.name);
      setGlobalError('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to read image file');
    }
  };

  const clearTimelineImage = () => {
    setNewPostImageDataUrl('');
    setNewPostImageName('');

    if (timelineImageInputRef.current) {
      timelineImageInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isEditing || !profile || !walletAddress || walletAddress !== profile.stxAddress) {
      return;
    }

    const trimmed = profileDraft.username.trim();
    const original = profile.username?.trim().toLowerCase() || '';

    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Use 3-30 letters, numbers, or underscores.');
      return;
    }

    if (trimmed.toLowerCase() === original) {
      setUsernameStatus('available');
      setUsernameMessage('This is your current username.');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking username...');

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmed);
        setUsernameStatus(result.available ? 'available' : 'taken');
        setUsernameMessage(result.available ? 'Username is available.' : 'Another user already has this username.');
      } catch (error) {
        setUsernameStatus('invalid');
        setUsernameMessage(error instanceof Error ? error.message : 'Could not validate username.');
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isEditing, profile, profileDraft.username, walletAddress]);

  const handleModalUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setGlobalError('Please select an image file.');
      return;
    }

    try {
      const dataUrl = await imageToDataUrl(file);
      if (!dataUrl) {
        return;
      }
      setPendingImage(dataUrl);
      setImageZoom(1);
      setGlobalError('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to read image file');
    }
  };

  const addSkill = () => {
    const next = skillInput.trim();

    if (!next) {
      return;
    }

    setProfileDraft((current) => {
      const existingSkills = current.skills.map((skill) => skill.toLowerCase());
      if (existingSkills.includes(next.toLowerCase())) {
        return current;
      }

      return {
        ...current,
        skills: [...current.skills, next],
      };
    });
    setSkillInput('');
    window.requestAnimationFrame(() => skillInputRef.current?.focus());
  };

  const handlePostTimeline = async () => {
    if ((!newPostText.trim() && !newPostImageDataUrl) || isPostingTimeline || !profile || walletAddress !== profile.stxAddress) {
      return;
    }

    setIsPostingTimeline(true);

    try {
      const created = await createSocialPost({
        content: newPostText.trim() || undefined,
        imageDataUrl: newPostImageDataUrl || undefined,
      });
      setTimelinePosts((current) => [
        created,
        ...current,
      ]);
      setNewPostText('');
      clearTimelineImage();
      setGlobalError('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to create timeline post.');
    } finally {
      setIsPostingTimeline(false);
    }
  };

  const handleToggleTimelineLike = async (postId: number) => {
    if (!isSignedIn) {
      return;
    }

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
      setGlobalError(error instanceof Error ? error.message : 'Failed to update post like.');
    }
  };

  const handleRequestConnection = async (userId?: number) => {
    const nextUserId = userId || profile?.id;

    if (!nextUserId || !profile || (walletAddress && walletAddress === profile.stxAddress)) {
      return;
    }

    try {
      await requestConnection(nextUserId);
      setConnectionSuggestions((current) => current.filter((entry) => entry.id !== nextUserId));
      const refreshed = await getConnections();
      setConnections(refreshed);
      setGlobalError('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to request connection.');
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
      setGlobalError(error instanceof Error ? error.message : 'Failed to update connection.');
    }
  };

  const isOwnProfile = Boolean(walletAddress && profile?.stxAddress && walletAddress === profile.stxAddress);
  const resolvedRole = profile?.role || userRole;
  const isClient = resolvedRole === 'client';
  const normalizedUsername = profileDraft.username.trim().toLowerCase();
  const displayName = profileDraft.name.trim() || profile?.name || profileDraft.username.trim() || profile?.username || (profile?.stxAddress ? `${profile.stxAddress.slice(0, 6)}...${profile.stxAddress.slice(-4)}` : isClient ? 'Client Profile' : 'Freelancer Profile');
  const displayHandle = profileDraft.username.trim()
    ? `@${normalizedUsername}`
    : profile?.username
      ? `@${profile.username}`
      : profile?.stxAddress
        ? `@${profile.stxAddress.slice(0, 8).toLowerCase()}`
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
  const normalizedWebsite = normalizeUrl(websiteLink);
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'N/A';
  const displaySkills = profileDraft.skills.length ? profileDraft.skills : profile?.skills || [];
  const displaySpecialty = profileDraft.specialty || profile?.specialty || (isClient ? 'Decentralized Finance' : 'Freelancer');
  const locationDisplay = [city.trim(), country.trim()].filter(Boolean).join(', ');
  const websiteHref = normalizedWebsite || '#';
  const hasInvalidLinks = portfolioLinks.some((link) => link.url.trim().length > 0 && !normalizeUrl(link.url));
  const canSaveProfile = isOwnProfile && !isSaving && !hasInvalidLinks && usernameStatus !== 'checking' && usernameStatus !== 'taken' && usernameStatus !== 'invalid';
  const acceptedConnections = isOwnProfile ? connections.filter((connection) => connection.status === 'accepted') : [];
  const incomingConnectionRequests = isOwnProfile ? connections.filter((connection) => connection.status === 'pending' && connection.direction === 'incoming') : [];
  const outgoingConnectionRequests = isOwnProfile ? connections.filter((connection) => connection.status === 'pending' && connection.direction === 'outgoing') : [];
  const relationship = !isOwnProfile && profile ? connections.find((connection) => connection.otherUser?.id === profile.id) || null : null;

  const handleSaveProfile = async () => {
    if (!profile || !canSaveProfile) {
      return;
    }

    const normalizedLinks = portfolioLinks.map((link) => normalizeUrl(link.url)).filter(Boolean);

    setIsSaving(true);
    try {
      const updated = await updateMyProfile({
        name: profileDraft.name.trim() || undefined,
        username: normalizedUsername || undefined,
        about: profileDraft.about.trim() || undefined,
        specialty: profileDraft.specialty.trim() || undefined,
        hourlyRate: profileDraft.hourlyRate.trim() || undefined,
        company: profileDraft.company.trim() || undefined,
        skills: profileDraft.skills.filter(Boolean),
        portfolio: normalizedLinks,
        avatar: profileImage || '',
        coverImage: coverImage || '',
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        language: language.trim() || undefined,
      });
      setProfile(updated);
      setProfileDraft((current) => ({
        ...current,
        name: updated.name || '',
        username: updated.username || '',
        about: updated.about || '',
        specialty: updated.specialty || '',
        hourlyRate: updated.hourlyRate || '',
        company: updated.company || '',
        skills: updated.skills || [],
        portfolio: updated.portfolio || [],
      }));
      setCity(updated.city || '');
      setCountry(updated.country || '');
      setLanguage(updated.language || '');
      setProfileImage(updated.avatar || fallbackAvatar(updated.role));
      setCoverImage(updated.coverImage || fallbackCover());
      setPortfolioLinks(parsePortfolioLinks(updated.portfolio));
      setUsernameStatus('idle');
      setUsernameMessage('');
      setGlobalError('');
      setIsEditing(false);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (!isOwnProfile) {
      return;
    }

    if (isEditing) {
      handleSaveProfile();
      return;
    }

    setPortfolioLinks(parsePortfolioLinks(profile?.portfolio));
    setProfileImage(profile?.avatar || fallbackAvatar(profile?.role));
    setCoverImage(profile?.coverImage || fallbackCover());
    setSkillInput('');
    setUsernameStatus('idle');
    setUsernameMessage('');
    setGlobalError('');
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom">
          <div className="card p-8 text-center text-sm text-muted">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom">
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-black mb-3">Profile unavailable</h2>
            <p className="text-sm text-muted">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom">
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-black mb-3">No profile selected</h2>
            <p className="text-sm text-muted">Connect your wallet to open your profile or use a public profile URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-4 sm:px-6 md:pl-[92px]">
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
                  onClick={closeImageEditor}
                  className="absolute top-4 right-4 text-muted hover:text-ink"
                >
                  <X size={20} />
                </button>
                <h3 className="text-2xl font-black mb-6">Update {imageToEdit === 'profile' ? 'Profile Picture' : 'Cover Image'}</h3>
                
                <div className="bg-ink/5 border border-border rounded-[15px] p-8 mb-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  {/* Simulated Cropper Area */}
                  <img 
                    src={toApiAssetUrl(pendingImage || (imageToEdit === 'profile' ? profileImage : coverImage))} 
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                    alt="Original"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute border-2 border-accent-orange shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ${imageToEdit === 'profile' ? 'w-48 h-48 rounded-full' : 'w-full h-32'}`}>
                    <img 
                      src={toApiAssetUrl(pendingImage || (imageToEdit === 'profile' ? profileImage : coverImage))} 
                      className="w-full h-full object-cover"
                      style={{ transform: `scale(${imageZoom})` }}
                      alt="Cropped"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg/80 backdrop-blur-md px-4 py-2 rounded-[15px] text-xs font-bold flex items-center gap-4">
                    <button type="button" onClick={() => setImageZoom((current) => Math.min(2.5, Number((current + 0.1).toFixed(2))))} className="hover:text-accent-orange"><ZoomIn size={16} /></button>
                    <input type="range" min="1" max="2.5" step="0.1" value={imageZoom} onChange={(e) => setImageZoom(Number(e.target.value))} className="w-24 accent-accent-orange" />
                    <button type="button" onClick={() => setImageZoom((current) => Math.max(1, Number((current - 0.1).toFixed(2))))} className="hover:text-accent-orange"><ZoomOut size={16} /></button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <>
                    <input ref={imageUploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleModalUploadChange} />
                  </>
                  <button type="button" onClick={() => imageUploadInputRef.current?.click()} className="btn-outline py-2 px-4 text-sm flex items-center gap-2">
                    <Upload size={16} /> Upload New
                  </button>
                  <div className="flex gap-2">
                    <button onClick={closeImageEditor} className="px-4 py-2 rounded-[15px] text-sm font-bold text-muted hover:text-ink transition-colors">Cancel</button>
                    <button onClick={handleImageSave} className="btn-primary py-2 px-6 text-sm">Save Image</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Header */}
        <section className="mb-10">
          {globalError && <div className="card mb-6 border border-accent-red/40 text-sm text-accent-red">{globalError}</div>}
          {/* Cover Image */}
          <div className="relative h-48 md:h-64 rounded-[15px] overflow-hidden mb-6 group">
            <img 
              src={toApiAssetUrl(coverImage)} 
              className="w-full h-full object-cover" 
              alt="Banner"
              referrerPolicy="no-referrer"
            />
            {isEditing && isOwnProfile && (
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
                  src={toApiAssetUrl(profileImage)} 
                  className="w-32 h-32 md:w-40 md:h-40 rounded-[10px] object-cover" 
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-accent-cyan border-4 border-bg rounded-full"></div>
                {isEditing && isOwnProfile && (
                  <button 
                    onClick={() => openImageEditor('profile')}
                    className="absolute inset-0 m-auto w-10 h-10 bg-bg/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-accent-orange transition-colors"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="min-w-0 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      {isEditing ? (
                        <div className="flex w-full min-w-0 flex-col gap-2">
                          <input
                            type="text"
                            value={profileDraft.name}
                            onChange={(e) => setProfileDraft((current) => ({ ...current, name: e.target.value }))}
                            className="w-full min-w-0 text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter bg-ink/5 border border-border rounded-[10px] px-3 py-1 outline-none focus:border-accent-orange"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={profileDraft.username}
                            onChange={(e) => setProfileDraft((current) => ({ ...current, username: e.target.value }))}
                            className={`w-full min-w-0 text-lg font-bold bg-ink/5 border rounded-[10px] px-3 py-1 outline-none focus:border-accent-orange ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-accent-red' : 'border-border'}`}
                            placeholder="Username"
                          />
                          {usernameMessage ? <p className={`text-xs font-bold ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-accent-red' : 'text-muted'}`}>{usernameMessage}</p> : null}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
                              {displayName}
                            </h1>
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
                            <input
                              type="text"
                              value={websiteLink}
                              onChange={(e) => handleWebsiteChange(e.target.value)}
                              className="w-full bg-ink/5 border border-border rounded-[5px] px-2 py-1 text-xs outline-none focus:border-accent-orange"
                              placeholder="Website"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex items-center gap-1"><MapPin size={14} /> {locationDisplay || 'Location not added'}</span>
                          <span className="flex items-center gap-1"><Globe size={14} /> {language || 'Language not added'}</span>
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
                  <div className="flex w-full md:w-auto gap-2 md:gap-4">
                    {isOwnProfile ? (
                      <button onClick={handleEditToggle} disabled={isEditing && !canSaveProfile} className="btn-outline flex-1 md:flex-none justify-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Edit2 size={16} /> {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit Profile'}
                      </button>
                    ) : !isEditing ? (
                      <>
                        {isSignedIn ? <button onClick={() => handleRequestConnection()} disabled={relationship?.status === 'accepted' || relationship?.status === 'pending'} className="btn-primary hidden md:block disabled:opacity-50 disabled:cursor-not-allowed">{relationship?.status === 'accepted' ? 'Connected' : relationship?.status === 'pending' ? 'Request sent' : 'Connect'}</button> : null}
                        {isSignedIn ? <button onClick={() => { setRecipientAddress(profile.stxAddress); setIsMessageModalOpen(true); }} className="p-3 rounded-[15px] border border-border hover:bg-ink/10 transition-colors">
                          <MessageSquare size={20} />
                        </button> : null}
                      </>
                    ) : null}
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
                  <div className="flex gap-2 pb-2 flex-wrap">
                    {nfts.map((nft) => (
                      <div
                        key={nft.id}
                        className="w-6 h-6 flex items-center justify-center rounded-sm font-bold text-[10px] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-1px_2px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.4)] relative group cursor-pointer bg-accent-orange"
                      >
                        {nft.name.slice(0, 1).toUpperCase()}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-bg text-[10px] rounded-[15px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                          {nft.name}
                        </div>
                      </div>
                    ))}
                    {nfts.length === 0 ? <p className="text-[10px] text-muted">No reputation NFTs yet.</p> : null}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
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
                    <h3 className="text-sm font-bold uppercase tracking-widest text-accent-orange mb-4">{isEditing ? 'Add Skills' : 'Skills'}</h3>
                    <div className="flex flex-wrap gap-3">
                      {displaySkills.map(tool => (
                          <span key={tool} className="px-4 py-2 bg-ink/5 rounded-full text-xs font-bold border border-border inline-flex items-center gap-2">
                            {tool}
                            {isEditing ? <button type="button" onClick={() => setProfileDraft((current) => ({ ...current, skills: current.skills.filter((entry) => entry !== tool) }))} className="text-muted hover:text-ink"><X size={12} /></button> : null}
                          </span>
                        ))}
                        {displaySkills.length === 0 && <span className="text-xs text-muted">No skills added yet.</span>}
                      </div>
                      {isEditing && (
                        <div className="flex gap-3 mt-4">
                          <input
                            ref={skillInputRef}
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSkill();
                              }
                            }}
                            className="w-full bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm outline-none focus:border-accent-orange"
                            placeholder="Add a skill"
                          />
                          <button type="button" onClick={addSkill} className="btn-outline py-3 px-4 text-sm flex items-center gap-2 shrink-0">
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-accent-blue mb-4">Company Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-muted mb-1">Industry</p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileDraft.specialty}
                              onChange={(e) => setProfileDraft((current) => ({ ...current, specialty: e.target.value }))}
                              className="w-full bg-ink/5 border border-border rounded-[10px] px-3 py-2 text-sm outline-none focus:border-accent-orange"
                              placeholder="Industry"
                            />
                          ) : (
                            <p className="font-bold text-sm">{displaySpecialty}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Total Spend</p>
                          <p className="font-bold text-sm">{formatTokenAmount(totalBudget)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Founded</p>
                          <p className="font-bold text-sm">{joinedDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Company</p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profileDraft.company}
                              onChange={(e) => setProfileDraft((current) => ({ ...current, company: e.target.value }))}
                              className="w-full bg-ink/5 border border-border rounded-[10px] px-3 py-2 text-sm outline-none focus:border-accent-orange"
                              placeholder="Company name"
                            />
                          ) : (
                            <p className="font-bold text-sm">{profile?.company || 'Not added yet'}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Website</p>
                          <a href={websiteHref} className="font-bold text-sm text-accent-cyan hover:underline">{websiteLink || 'Not added yet'}</a>
                        </div>
                        <div>
                          <p className="text-xs text-muted mb-1">Location</p>
                          <p className="font-bold text-sm">{locationDisplay || 'Not added'}</p>
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
                        {portfolioLinks.map((link) => {
                          const linkLabel = linkTypeOptions.find((option) => option.value === link.type)?.label || 'Link';
                          const normalizedLink = normalizeUrl(link.url);
                          const isInvalidLink = link.url.trim().length > 0 && !normalizedLink;

                          return (
                            <div key={link.id} className="flex items-center gap-3 p-4 border border-border rounded-[15px] bg-ink/5 hover:bg-ink/10 transition-colors relative">
                              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted shrink-0">
                                <LinkIcon size={16} />
                              </div>
                              <div className="flex-1 overflow-hidden pr-6">
                                {isEditing ? (
                                  <div className="flex flex-col gap-1">
                                    <select value={link.type} onChange={(e) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, type: e.target.value as LinkTypeValue } : entry))} className="w-full bg-surface text-ink border-b border-border text-sm font-bold outline-none focus:border-accent-orange">
                                      {linkTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value} className="bg-surface text-ink">{option.label}</option>
                                      ))}
                                    </select>
                                    <input type="text" value={link.url} onChange={(e) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, url: e.target.value } : entry))} className={`w-full bg-transparent border-b text-xs text-muted outline-none focus:border-accent-orange ${isInvalidLink ? 'border-accent-red' : 'border-border'}`} placeholder="https://example.com" />
                                    {isInvalidLink ? <p className="text-[10px] font-bold text-accent-red">Enter a valid `http` or `https` link.</p> : null}
                                  </div>
                                ) : (
                                  <>
                                    <h4 className="font-bold text-sm truncate">{linkLabel}</h4>
                                    <a href={normalizedLink || '#'} target="_blank" rel="noreferrer" className="text-xs text-accent-cyan hover:underline truncate block">{link.url}</a>
                                  </>
                                )}
                              </div>
                              {isEditing ? (
                                <button onClick={() => handleRemoveLink(link.id)} className="absolute top-1/2 -translate-y-1/2 right-4 text-muted hover:text-accent-red shrink-0"><X size={16} /></button>
                              ) : normalizedLink ? null : (
                                <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[10px] font-bold text-accent-red">Invalid</span>
                              )}
                            </div>
                          );
                        })}
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
                        <div key={project.id} className="p-4 border border-border rounded-[15px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-ink/5 transition-colors cursor-pointer">
                          <div>
                            <h4 className="font-bold text-sm mb-1">{project.title}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${project.status === 'open' ? 'text-accent-cyan' : 'text-accent-orange'}`}>{project.status}</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-black text-sm">{formatTokenAmount(project.budget)} {project.tokenType}</p>
                            <p className="text-xs text-muted">Budget</p>
                          </div>
                        </div>
                      ))}
                      {recentProjects.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
                    </div>
                  </div>
                )}

                {isClient && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-black">Company Links</h2>
                      {isEditing && <button onClick={handleAddLink} className="text-xs font-bold text-accent-orange hover:underline flex items-center gap-1"><Plus size={14} /> Add Link</button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {portfolioLinks.map((link) => {
                        const linkLabel = linkTypeOptions.find((option) => option.value === link.type)?.label || 'Link';
                        const normalizedLink = normalizeUrl(link.url);
                        const isInvalidLink = link.url.trim().length > 0 && !normalizedLink;

                        return (
                          <div key={link.id} className="flex items-center gap-3 p-4 border border-border rounded-[15px] bg-ink/5 hover:bg-ink/10 transition-colors relative">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted shrink-0">
                              <LinkIcon size={16} />
                            </div>
                            <div className="flex-1 overflow-hidden pr-6">
                              {isEditing ? (
                                <div className="flex flex-col gap-1">
                                  <select value={link.type} onChange={(e) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, type: e.target.value as LinkTypeValue } : entry))} className="w-full bg-surface text-ink border-b border-border text-sm font-bold outline-none focus:border-accent-orange">
                                    {linkTypeOptions.map((option) => (
                                      <option key={option.value} value={option.value} className="bg-surface text-ink">{option.label}</option>
                                    ))}
                                  </select>
                                  <input type="text" value={link.url} onChange={(e) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, url: e.target.value } : entry))} className={`w-full bg-transparent border-b text-xs text-muted outline-none focus:border-accent-orange ${isInvalidLink ? 'border-accent-red' : 'border-border'}`} placeholder="https://example.com" />
                                  {isInvalidLink ? <p className="text-[10px] font-bold text-accent-red">Enter a valid `http` or `https` link.</p> : null}
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-bold text-sm truncate">{linkLabel}</h4>
                                  <a href={normalizedLink || '#'} target="_blank" rel="noreferrer" className="text-xs text-accent-cyan hover:underline truncate block">{link.url}</a>
                                </>
                              )}
                            </div>
                            {isEditing ? (
                              <button onClick={() => handleRemoveLink(link.id)} className="absolute top-1/2 -translate-y-1/2 right-4 text-muted hover:text-accent-red shrink-0"><X size={16} /></button>
                            ) : normalizedLink ? null : (
                              <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[10px] font-bold text-accent-red">Invalid</span>
                            )}
                          </div>
                        );
                      })}
                      {portfolioLinks.length === 0 && <p className="text-sm text-muted md:col-span-2">No links added yet.</p>}
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
                      <div key={project.id} className="p-4 border border-border rounded-[15px] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div>
                          <h4 className="font-bold text-sm mb-1">{project.title}</h4>
                          <p className="text-xs text-muted">{formatRelativeTime(project.createdAt)} • {project.status}</p>
                        </div>
                        <div className="text-left sm:text-right">
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
                {isOwnProfile && (
                  <div className="card p-4 space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-[10px] bg-ink/10 shrink-0 overflow-hidden">
                        <img src={toApiAssetUrl(profileImage)} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                      </div>
                      <input 
                        type="text" 
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="What's on your mind?" 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none" 
                        onKeyDown={(e) => e.key === 'Enter' && handlePostTimeline()}
                      />
                      <button onClick={handlePostTimeline} disabled={isPostingTimeline || (!newPostText.trim() && !newPostImageDataUrl)} className="btn-primary py-2 px-4 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"><Send size={16} /></button>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <input
                        ref={timelineImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleTimelineImageChange}
                      />
                      <button type="button" onClick={() => timelineImageInputRef.current?.click()} className="btn-outline py-2 px-4 text-xs flex items-center gap-2">
                        <Upload size={16} /> Attach image
                      </button>
                      {newPostImageName && (
                        <div className="flex items-center gap-2 text-xs text-muted ml-auto">
                          <span className="truncate max-w-48">{newPostImageName}</span>
                          <button type="button" onClick={clearTimelineImage} className="text-muted hover:text-ink">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {newPostImageDataUrl && (
                      <div className="relative rounded-[15px] overflow-hidden border border-border bg-ink/5">
                        <img src={newPostImageDataUrl} className="w-full max-h-72 object-cover" alt="New post attachment" />
                        <button type="button" onClick={clearTimelineImage} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg/80 text-ink flex items-center justify-center">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {timelinePosts.map((post) => (
                  <div key={post.id} className="card p-6 hover:border-accent-orange transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img src={toApiAssetUrl(post.authorAvatar) || profileImage} className="w-10 h-10 rounded-[10px] object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-sm">{post.authorName?.trim() || post.authorUsername?.trim() || displayName}</h4>
                          <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                      </div>
                      <button className="text-muted hover:text-ink"><MoreHorizontal size={16} /></button>
                    </div>
                    <Link to={`/post/${post.id}`} className="block group">
                      {post.content && <p className="text-sm mb-4 group-hover:text-accent-orange transition-colors">{post.content}</p>}
                      {post.imageUrl && (
                        <img src={toApiAssetUrl(post.imageUrl)} className="w-full rounded-[15px] mb-4 object-cover max-h-64" alt="Post content" referrerPolicy="no-referrer" />
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
                {isOwnProfile ? <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div> : <div className="card p-6 text-sm text-muted">Bounty activity is only available on your own profile.</div>}
              </div>
            )}

            {activeTab === 'Friends' && (
              <div className="space-y-6">
                {isOwnProfile ? <>
                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-4">Connections</h3>
                  <div className="space-y-4">
                    {acceptedConnections.map((connection) => (
                      <div key={connection.id} className="border border-border rounded-[15px] p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-sm">{toDisplayName(connection.otherUser) || 'Connection'}</p>
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
                          <p className="font-bold text-sm mb-1">{toDisplayName(connection.otherUser) || 'User'}</p>
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
                            <p className="font-bold text-sm">{toDisplayName(suggestion)}</p>
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
                            <p className="font-bold text-sm">{toDisplayName(connection.otherUser) || 'User'}</p>
                            <p className="text-[10px] text-muted uppercase tracking-widest">{connection.otherUser?.role || 'User'}</p>
                          </div>
                          <span className="text-xs font-bold text-muted">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </> : <div className="card p-6 text-sm text-muted">Connection management is only available on your own profile.</div>}
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`card ${isClient ? 'bg-accent-blue' : 'bg-accent-orange'} text-bg`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-6">
                <p className="text-2xl font-black break-words">{isClient ? `${formatTokenAmount(totalBudget)}` : profile?.hourlyRate ? `${profile.hourlyRate}` : `${formatTokenAmount(profile?.totalEarned)}`}</p>
                <p className="text-xs font-bold opacity-60">{isClient ? 'Total Spend' : profile?.hourlyRate ? 'per hour' : 'Total Earned'}</p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-start justify-between gap-3 text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">Location</span>
                  <span className="text-right">{locationDisplay || 'Not added'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">{isClient ? 'Jobs Posted' : 'Projects'}</span>
                  <span>{projects.length}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-xs font-bold border-b border-bg/10 pb-2">
                  <span className="opacity-60">{isClient ? 'Member Since' : 'Rating'}</span>
                  <span>{isClient ? joinedDate : averageRating}</span>
                </div>
              </div>
              {!isEditing && isOwnProfile ? (
                <button onClick={handleEditToggle} className="w-full bg-bg text-white py-4 rounded-[15px] font-bold hover:bg-white hover:text-bg transition-all">
                  Edit Profile
                </button>
              ) : null}
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
