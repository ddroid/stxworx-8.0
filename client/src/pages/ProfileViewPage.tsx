import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Camera,
  Check,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import * as Shared from '../shared';
import {
  acceptConnection,
  checkUsernameAvailability,
  createSocialPost,
  declineConnection,
  formatAddress,
  formatRelativeTime,
  getConnectionSuggestions,
  getConnections,
  getMyBountyDashboard,
  getSocialPosts,
  getUserNfts,
  getUserProfile,
  getUserProfileByUsername,
  getUserProjects,
  getUserReviews,
  requestConnection,
  toApiAssetUrl,
  toDisplayName,
  toggleSocialPostLike,
  updateMyProfile,
  type ApiBountyDashboard,
  type ApiConnection,
  type ApiReputationNft,
  type ApiSocialPost,
} from '../lib/api';
import type { ApiProject } from '../types/job';
import type { ApiUserProfile, ApiUserReview, UserRole } from '../types/user';

type PortfolioLinkDraft = {
  id: number;
  type: LinkTypeValue;
  url: string;
};

type LinkTypeValue = 'website' | 'github' | 'linkedin' | 'twitter' | 'dribbble' | 'behance' | 'custom';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

type ActiveTab = 'Profile' | 'Timeline' | 'Projects' | 'Friends' | 'NFTs';

const tabs: ActiveTab[] = ['Profile', 'Timeline', 'Projects', 'Friends', 'NFTs'];

const linkTypeOptions: Array<{ value: LinkTypeValue; label: string }> = [
  { value: 'website', label: 'Website' },
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'behance', label: 'Behance' },
  { value: 'custom', label: 'Custom' },
];

const emptyDraft = {
  username: '',
  about: '',
  specialty: '',
  hourlyRate: '',
  company: '',
  skills: [] as string[],
  projectInterests: [] as string[],
  city: '',
  country: '',
  language: '',
};

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

function parsePortfolioLinks(links?: string[] | null) {
  return (links || []).map<PortfolioLinkDraft>((url, index) => ({
    id: Date.now() + index,
    type: inferLinkType(url),
    url,
  }));
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
  if (normalized.includes('dribbble.com')) {
    return 'dribbble';
  }
  if (normalized.includes('behance.net')) {
    return 'behance';
  }
  return 'website';
}

function toDraft(profile: ApiUserProfile | null) {
  if (!profile) {
    return emptyDraft;
  }

  return {
    username: profile.username || '',
    about: profile.about || '',
    specialty: profile.specialty || '',
    hourlyRate: profile.hourlyRate ? String(profile.hourlyRate) : '',
    company: profile.company || '',
    skills: profile.skills || [],
    projectInterests: profile.projectInterests || [],
    city: profile.city || '',
    country: profile.country || '',
    language: profile.language || '',
  };
}

function imageToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Could not read image file'));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-ink">{value}</p>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-surface p-6 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-lg font-black tracking-tight text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-border bg-ink/5 px-5 py-8 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

export function ProfileViewPage({ userRole }: { userRole: UserRole | null }) {
  const { walletAddress: currentWalletAddress, isSignedIn } = Shared.useWallet();
  const { walletAddressParam, profileIdentifier } = useParams<{ walletAddressParam?: string; profileIdentifier?: string }>();
  const [activeTab, setActiveTab] = useState<ActiveTab>('Profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState<ApiUserProfile | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [reviews, setReviews] = useState<ApiUserReview[]>([]);
  const [timelinePosts, setTimelinePosts] = useState<ApiSocialPost[]>([]);
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [connectionSuggestions, setConnectionSuggestions] = useState<Array<Pick<ApiUserProfile, 'id' | 'stxAddress' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'>>>([]);
  const [bountyDashboard, setBountyDashboard] = useState<ApiBountyDashboard | null>(null);
  const [nfts, setNfts] = useState<ApiReputationNft[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLinkDraft[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [avatarValue, setAvatarValue] = useState('');
  const [coverValue, setCoverValue] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostImageName, setNewPostImageName] = useState('');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const skillInputRef = useRef<HTMLInputElement | null>(null);
  const interestInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);

  const profilePathMode = walletAddressParam ? 'wallet' : profileIdentifier ? 'username' : 'me';
  const normalizedUsername = draft.username.trim().toLowerCase();
  const isOwnProfile = Boolean(currentWalletAddress && profile?.stxAddress && currentWalletAddress === profile.stxAddress);
  const resolvedRole = profile?.role || userRole;
  const isClient = resolvedRole === 'client';
  const pageTitle = isClient ? 'About Company' : 'About Freelancer';
  const displayName = toDisplayName(profile) || 'Profile';
  const displayHandle = profile?.username ? `@${profile.username}` : profile?.stxAddress ? `@${formatAddress(profile.stxAddress).replace(/\.\.\./g, '_').toLowerCase()}` : '@profile';
  const locationLine = [profile?.city, profile?.country].filter(Boolean).join(', ');
  const hasInvalidLinks = portfolioLinks.some((link) => link.url.trim().length > 0 && !normalizeUrl(link.url));
  const canSaveProfile = !isSaving && !hasInvalidLinks && usernameStatus !== 'checking' && usernameStatus !== 'taken' && usernameStatus !== 'invalid';
  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return '0.0';
    }
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);
  const totalBudget = useMemo(() => {
    const amount = projects.reduce((total, project) => total + Number(project.budget || 0), 0);
    return Number.isFinite(amount) ? amount.toLocaleString() : '0';
  }, [projects]);
  const acceptedConnections = useMemo(() => connections.filter((connection) => connection.status === 'accepted'), [connections]);
  const incomingRequests = useMemo(() => connections.filter((connection) => connection.status === 'pending' && connection.direction === 'incoming'), [connections]);
  const outgoingRequests = useMemo(() => connections.filter((connection) => connection.status === 'pending' && connection.direction === 'outgoing'), [connections]);

  const loadProfilePage = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      let profileResponse: ApiUserProfile;

      if (profilePathMode === 'wallet' && walletAddressParam) {
        profileResponse = await getUserProfile(walletAddressParam);
      } else if (profilePathMode === 'username' && profileIdentifier) {
        profileResponse = await getUserProfileByUsername(profileIdentifier);
      } else if (currentWalletAddress) {
        profileResponse = await getUserProfile(currentWalletAddress);
      } else {
        setProfile(null);
        setProjects([]);
        setReviews([]);
        setTimelinePosts([]);
        setConnections([]);
        setConnectionSuggestions([]);
        setBountyDashboard(null);
        setNfts([]);
        setDraft(emptyDraft);
        setPortfolioLinks([]);
        setAvatarValue('');
        setCoverValue('');
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
        isSignedIn && currentWalletAddress === profileResponse.stxAddress ? getConnectionSuggestions().catch(() => []) : Promise.resolve([]),
        isSignedIn && currentWalletAddress === profileResponse.stxAddress ? getMyBountyDashboard().catch(() => null) : Promise.resolve(null),
      ]);

      setProfile(profileResponse);
      setProjects(projectResponse);
      setReviews(reviewResponse);
      setTimelinePosts(socialResponse);
      setNfts(nftResponse);
      setConnections(connectionResponse);
      setConnectionSuggestions(suggestionResponse);
      setBountyDashboard(bountyResponse);
      setDraft(toDraft(profileResponse));
      setPortfolioLinks(parsePortfolioLinks(profileResponse.portfolio));
      setAvatarValue(profileResponse.avatar || '');
      setCoverValue(profileResponse.coverImage || '');
      setUsernameStatus('idle');
      setUsernameMessage('');
      setGlobalError('');
    } catch (error) {
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
      setIsLoading(false);
    }
  }, [currentWalletAddress, isSignedIn, profileIdentifier, profilePathMode, walletAddressParam]);

  useEffect(() => {
    loadProfilePage();
  }, [loadProfilePage]);

  useEffect(() => {
    if (!isEditing || !isOwnProfile) {
      return;
    }

    const trimmed = draft.username.trim();
    const original = profile?.username?.trim().toLowerCase() || '';

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

    const normalized = trimmed.toLowerCase();
    if (normalized === original) {
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
  }, [draft.username, isEditing, isOwnProfile, profile?.username]);

  const handleImagePick = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'cover' | 'post') => {
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
      if (target === 'avatar') {
        setAvatarValue(dataUrl);
      } else if (target === 'cover') {
        setCoverValue(dataUrl);
      } else {
        setNewPostImage(dataUrl);
        setNewPostImageName(file.name);
      }
      setGlobalError('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not read the selected image.');
    }
  }, []);

  const addSkill = useCallback(() => {
    const next = skillInput.trim();
    if (!next) {
      return;
    }

    setDraft((current) => {
      const existing = current.skills.map((skill) => skill.toLowerCase());
      if (existing.includes(next.toLowerCase())) {
        return current;
      }
      return { ...current, skills: [...current.skills, next] };
    });
    setSkillInput('');
    window.requestAnimationFrame(() => skillInputRef.current?.focus());
  }, [skillInput]);

  const addInterest = useCallback(() => {
    const next = interestInput.trim();
    if (!next) {
      return;
    }

    setDraft((current) => {
      const existing = current.projectInterests.map((interest) => interest.toLowerCase());
      if (existing.includes(next.toLowerCase())) {
        return current;
      }
      return { ...current, projectInterests: [...current.projectInterests, next] };
    });
    setInterestInput('');
    window.requestAnimationFrame(() => interestInputRef.current?.focus());
  }, [interestInput]);

  const handleSaveProfile = useCallback(async () => {
    if (!isOwnProfile || !profile || !canSaveProfile) {
      return;
    }

    const normalizedLinks = portfolioLinks
      .map((link) => normalizeUrl(link.url))
      .filter(Boolean);

    setIsSaving(true);
    setGlobalError('');

    try {
      const updated = await updateMyProfile({
        username: normalizedUsername || undefined,
        about: draft.about.trim() || undefined,
        specialty: draft.specialty.trim() || undefined,
        hourlyRate: draft.hourlyRate.trim() || undefined,
        company: draft.company.trim() || undefined,
        skills: draft.skills,
        portfolio: normalizedLinks.length ? normalizedLinks : [],
        projectInterests: draft.projectInterests,
        avatar: avatarValue || '',
        coverImage: coverValue || '',
        city: draft.city.trim() || undefined,
        country: draft.country.trim() || undefined,
        language: draft.language.trim() || undefined,
      });

      setProfile(updated);
      setDraft(toDraft(updated));
      setPortfolioLinks(parsePortfolioLinks(updated.portfolio));
      setAvatarValue(updated.avatar || '');
      setCoverValue(updated.coverImage || '');
      setIsEditing(false);
      setUsernameStatus('idle');
      setUsernameMessage('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setIsSaving(false);
    }
  }, [avatarValue, canSaveProfile, coverValue, draft, isOwnProfile, normalizedUsername, portfolioLinks, profile]);

  const handleCancelEditing = useCallback(() => {
    setDraft(toDraft(profile));
    setPortfolioLinks(parsePortfolioLinks(profile?.portfolio));
    setAvatarValue(profile?.avatar || '');
    setCoverValue(profile?.coverImage || '');
    setSkillInput('');
    setInterestInput('');
    setUsernameStatus('idle');
    setUsernameMessage('');
    setGlobalError('');
    setIsEditing(false);
  }, [profile]);

  const handleCreatePost = useCallback(async () => {
    if (!isOwnProfile || isPosting || (!newPostText.trim() && !newPostImage)) {
      return;
    }

    setIsPosting(true);
    try {
      const created = await createSocialPost({
        content: newPostText.trim() || undefined,
        imageDataUrl: newPostImage || undefined,
      });
      setTimelinePosts((current) => [created, ...current]);
      setNewPostText('');
      setNewPostImage('');
      setNewPostImageName('');
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not publish your post.');
    } finally {
      setIsPosting(false);
    }
  }, [isOwnProfile, isPosting, newPostImage, newPostText]);

  const handleToggleLike = useCallback(async (postId: number) => {
    if (!isSignedIn) {
      return;
    }

    try {
      const updated = await toggleSocialPostLike(postId);
      setTimelinePosts((current) => current.map((post) => (
        post.id === postId
          ? { ...post, likesCount: updated.likesCount, likedByViewer: updated.likedByViewer }
          : post
      )));
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not update that like.');
    }
  }, [isSignedIn]);

  const handleRequestConnection = useCallback(async () => {
    if (!profile?.id || isOwnProfile) {
      return;
    }

    try {
      await requestConnection(profile.id);
      const refreshed = await getConnections();
      setConnections(refreshed);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not send the connection request.');
    }
  }, [isOwnProfile, profile?.id]);

  const handleRespondToConnection = useCallback(async (connectionId: number, action: 'accept' | 'decline') => {
    try {
      const updated = action === 'accept'
        ? await acceptConnection(connectionId)
        : await declineConnection(connectionId);
      setConnections((current) => current.map((connection) => connection.id === updated.id ? updated : connection));
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Could not update that connection request.');
    }
  }, []);

  const relationship = useMemo(() => {
    if (!profile || isOwnProfile) {
      return null;
    }

    return connections.find((connection) => connection.otherUser?.id === profile.id) || null;
  }, [connections, isOwnProfile, profile]);

  if (isLoading) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-[20px] border border-border bg-surface px-5 py-4 text-sm font-bold text-muted">
            <Loader2 size={18} className="animate-spin text-accent-orange" />
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom max-w-3xl">
          <div className="rounded-[24px] border border-border bg-surface p-8 text-center">
            <ShieldAlert size={42} className="mx-auto text-accent-orange" />
            <h1 className="mt-4 text-3xl font-black tracking-tight">Profile unavailable</h1>
            <p className="mt-3 text-muted">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-28 pb-20 px-6 md:pl-[92px]">
        <div className="container-custom max-w-3xl">
          <div className="rounded-[24px] border border-border bg-surface p-8 text-center">
            <h1 className="text-3xl font-black tracking-tight">No profile selected</h1>
            <p className="mt-3 text-muted">Connect your wallet to open your profile or use a public profile URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom space-y-8">
        <Shared.MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientAddress={profile.stxAddress}
        />

        <div className="overflow-hidden rounded-[30px] border border-border bg-surface">
          <div className="relative h-56 w-full bg-gradient-to-r from-accent-orange/80 via-accent-cyan/50 to-accent-purple/70">
            {coverValue ? (
              <img src={toApiAssetUrl(coverValue)} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent" />
            {isEditing && isOwnProfile ? (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-bg/70 px-4 py-2 text-sm font-bold text-white backdrop-blur"
              >
                <Camera size={16} />
                Change cover
              </button>
            ) : null}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImagePick(event, 'cover')} />
          </div>

          <div className="relative px-6 pb-6 md:px-8">
            <div className="-mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 md:flex-row md:items-end">
                <div className="relative h-28 w-28 overflow-hidden rounded-[28px] border-4 border-bg bg-ink/10 shadow-xl">
                  {avatarValue ? (
                    <img src={toApiAssetUrl(avatarValue)} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-accent-orange">{displayName.charAt(0).toUpperCase()}</div>
                  )}
                  {isEditing && isOwnProfile ? (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-bg/80 py-2 text-xs font-bold text-white"
                    >
                      <Camera size={14} />
                      Avatar
                    </button>
                  ) : null}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImagePick(event, 'avatar')} />
                </div>

                <div className="space-y-2 pb-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight text-ink md:text-4xl">{displayName}</h1>
                    <span className="rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-muted">{resolvedRole || 'member'}</span>
                  </div>
                  <p className="text-sm font-bold text-muted">{displayHandle}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted">
                    {profile.specialty ? <span>{profile.specialty}</span> : null}
                    {locationLine ? <span>{locationLine}</span> : null}
                    {profile.language ? <span>{profile.language}</span> : null}
                    <span>{formatAddress(profile.stxAddress)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isOwnProfile ? (
                  isEditing ? (
                    <>
                      <button type="button" onClick={handleCancelEditing} className="btn-outline inline-flex items-center gap-2 px-4 py-3 text-sm">
                        <X size={16} />
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveProfile} disabled={!canSaveProfile} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save profile
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setIsEditing(true)} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm">
                      <Pencil size={16} />
                      Edit profile
                    </button>
                  )
                ) : (
                  <>
                    {isSignedIn ? (
                      <button type="button" onClick={handleRequestConnection} disabled={relationship?.status === 'accepted' || relationship?.status === 'pending'} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                        <UserPlus size={16} />
                        {relationship?.status === 'accepted' ? 'Connected' : relationship?.status === 'pending' ? 'Request sent' : 'Connect'}
                      </button>
                    ) : null}
                    {isSignedIn ? (
                      <button type="button" onClick={() => setIsMessageModalOpen(true)} className="btn-outline inline-flex items-center gap-2 px-4 py-3 text-sm">
                        <MessageSquare size={16} />
                        Message
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <StatCard label="Projects" value={String(projects.length)} />
              <StatCard label="Reviews" value={String(reviews.length)} />
              <StatCard label="Rating" value={averageRating} />
              <StatCard label="Total volume" value={totalBudget} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-3 text-sm font-bold transition ${activeTab === tab ? 'bg-accent-orange text-white' : 'border border-border bg-surface text-muted hover:text-ink'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {globalError ? (
          <div className="rounded-[20px] border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-200">{globalError}</div>
        ) : null}

        {activeTab === 'Profile' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <SectionCard
                title="Profile details"
                action={!isEditing && profilePathMode !== 'me' && profile.username ? (
                  <Link to={`/profile/${profile.username}`} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-muted transition hover:text-ink">
                    Share handle
                    <ExternalLink size={14} />
                  </Link>
                ) : undefined}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-ink">Username</label>
                    <input
                      value={draft.username}
                      onChange={(event) => setDraft((current) => ({ ...current, username: event.target.value }))}
                      disabled={!isEditing || !isOwnProfile}
                      className={`w-full rounded-[18px] border px-4 py-3 text-sm outline-none transition ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500 bg-red-500/5 text-ink' : 'border-border bg-bg text-ink'} disabled:cursor-not-allowed disabled:opacity-80`}
                      placeholder="john_cena"
                    />
                    {isEditing && isOwnProfile && usernameMessage ? (
                      <p className={`mt-2 text-xs font-medium ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-300' : 'text-muted'}`}>{usernameMessage}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">{isClient ? 'Company name' : 'Specialty'}</label>
                    <input
                      value={isClient ? draft.company : draft.specialty}
                      onChange={(event) => setDraft((current) => isClient ? { ...current, company: event.target.value } : { ...current, specialty: event.target.value })}
                      disabled={!isEditing || !isOwnProfile}
                      className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder={isClient ? 'STXWORX Studio' : 'Product designer'}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">Hourly rate</label>
                    <input
                      value={draft.hourlyRate}
                      onChange={(event) => setDraft((current) => ({ ...current, hourlyRate: event.target.value }))}
                      disabled={!isEditing || !isOwnProfile}
                      className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="125"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">City</label>
                    <input
                      value={draft.city}
                      onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                      disabled={!isEditing || !isOwnProfile}
                      className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="Accra"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">Country</label>
                    <input
                      value={draft.country}
                      onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}
                      disabled={!isEditing || !isOwnProfile}
                      className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="Ghana"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">Language</label>
                    <input
                      value={draft.language}
                      onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))}
                      disabled={!isEditing || !isOwnProfile}
                      className="w-full rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                      placeholder="English"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={pageTitle}>
                <textarea
                  value={draft.about}
                  onChange={(event) => setDraft((current) => ({ ...current, about: event.target.value }))}
                  disabled={!isEditing || !isOwnProfile}
                  rows={7}
                  className="w-full rounded-[20px] border border-border bg-bg px-4 py-4 text-sm text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-80"
                  placeholder={isClient ? 'Describe your company, services, team, and the kind of projects you want to post.' : 'Describe your background, strengths, and the kinds of freelance work you do best.'}
                />
              </SectionCard>

              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-3">
                  {draft.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
                      {skill}
                      {isEditing && isOwnProfile ? (
                        <button
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, skills: current.skills.filter((entry) => entry !== skill) }))}
                          className="text-white/70 transition hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
                {isEditing && isOwnProfile ? (
                  <div className="mt-4 flex gap-3">
                    <input
                      ref={skillInputRef}
                      value={skillInput}
                      onChange={(event) => setSkillInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addSkill();
                        }
                      }}
                      className="flex-1 rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none"
                      placeholder="Add a skill and press Enter"
                    />
                    <button type="button" onClick={addSkill} className="btn-primary inline-flex items-center gap-2 px-4 py-3 text-sm">
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard title="Project interests">
                <div className="flex flex-wrap gap-3">
                  {draft.projectInterests.map((interest) => (
                    <span key={interest} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold text-ink">
                      {interest}
                      {isEditing && isOwnProfile ? (
                        <button
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, projectInterests: current.projectInterests.filter((entry) => entry !== interest) }))}
                          className="text-muted transition hover:text-ink"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
                {isEditing && isOwnProfile ? (
                  <div className="mt-4 flex gap-3">
                    <input
                      ref={interestInputRef}
                      value={interestInput}
                      onChange={(event) => setInterestInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addInterest();
                        }
                      }}
                      className="flex-1 rounded-[18px] border border-border bg-bg px-4 py-3 text-sm text-ink outline-none"
                      placeholder="Add an interest and press Enter"
                    />
                    <button type="button" onClick={addInterest} className="btn-outline inline-flex items-center gap-2 px-4 py-3 text-sm">
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                ) : null}
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Links">
                <div className="space-y-3">
                  {portfolioLinks.map((link) => {
                    const normalized = normalizeUrl(link.url);
                    const isInvalid = link.url.trim().length > 0 && !normalized;
                    const label = linkTypeOptions.find((option) => option.value === link.type)?.label || 'Link';

                    return (
                      <div key={link.id} className="rounded-[20px] border border-border bg-bg p-4">
                        <div className="flex flex-col gap-3 md:flex-row">
                          <select
                            value={link.type}
                            onChange={(event) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, type: event.target.value as LinkTypeValue } : entry))}
                            disabled={!isEditing || !isOwnProfile}
                            className="rounded-[16px] border border-border bg-surface px-3 py-3 text-sm font-bold text-ink outline-none disabled:cursor-not-allowed disabled:opacity-80"
                          >
                            {linkTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="flex-1">
                            <input
                              value={link.url}
                              onChange={(event) => setPortfolioLinks((current) => current.map((entry) => entry.id === link.id ? { ...entry, url: event.target.value } : entry))}
                              disabled={!isEditing || !isOwnProfile}
                              className={`w-full rounded-[16px] border px-4 py-3 text-sm text-ink outline-none transition ${isInvalid ? 'border-red-500 bg-red-500/5' : 'border-border bg-surface'} disabled:cursor-not-allowed disabled:opacity-80`}
                              placeholder={`Add your ${label.toLowerCase()} link`}
                            />
                            {isInvalid ? <p className="mt-2 text-xs font-medium text-red-300">Enter a valid `http` or `https` link.</p> : null}
                          </div>
                          {isEditing && isOwnProfile ? (
                            <button type="button" onClick={() => setPortfolioLinks((current) => current.filter((entry) => entry.id !== link.id))} className="inline-flex items-center justify-center rounded-[16px] border border-border px-4 py-3 text-sm font-bold text-muted transition hover:text-ink">
                              <X size={16} />
                            </button>
                          ) : normalized ? (
                            <a href={normalized} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-[16px] border border-border px-4 py-3 text-sm font-bold text-muted transition hover:text-ink">
                              <ExternalLink size={16} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isEditing && isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setPortfolioLinks((current) => [...current, { id: Date.now(), type: 'website', url: '' }])}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-bold text-muted transition hover:text-ink"
                  >
                    <Plus size={16} />
                    Add link
                  </button>
                ) : null}
              </SectionCard>

              <SectionCard title="Quick info">
                <div className="space-y-4 text-sm text-muted">
                  <div className="flex items-center gap-3"><Globe size={16} className="text-accent-orange" /> <span>{profile.stxAddress}</span></div>
                  {locationLine ? <div className="flex items-center gap-3"><LinkIcon size={16} className="text-accent-orange" /> <span>{locationLine}</span></div> : null}
                  {profile.language ? <div className="flex items-center gap-3"><Check size={16} className="text-accent-orange" /> <span>{profile.language}</span></div> : null}
                  <div className="flex items-center gap-3"><Check size={16} className="text-accent-orange" /> <span>Joined {formatRelativeTime(profile.createdAt)}</span></div>
                </div>
              </SectionCard>

              {isOwnProfile ? (
                <SectionCard title="Connections">
                  <div className="space-y-4">
                    {incomingRequests.length ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-ink">Pending requests</p>
                        {incomingRequests.map((connection) => (
                          <div key={connection.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-bg px-4 py-4">
                            <div>
                              <p className="font-bold text-ink">{toDisplayName(connection.otherUser)}</p>
                              <p className="text-xs text-muted">{connection.otherUser?.specialty || connection.otherUser?.role || 'Member'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleRespondToConnection(connection.id, 'accept')} className="btn-primary px-4 py-2 text-xs">Accept</button>
                              <button type="button" onClick={() => handleRespondToConnection(connection.id, 'decline')} className="btn-outline px-4 py-2 text-xs">Decline</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {acceptedConnections.length ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-ink">Your network</p>
                        {acceptedConnections.slice(0, 5).map((connection) => (
                          <div key={connection.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-bg px-4 py-4">
                            <div>
                              <p className="font-bold text-ink">{toDisplayName(connection.otherUser)}</p>
                              <p className="text-xs text-muted">{connection.otherUser?.specialty || connection.otherUser?.role || 'Member'}</p>
                            </div>
                            {connection.otherUser?.username ? <Link to={`/profile/${connection.otherUser.username}`} className="text-xs font-bold text-accent-orange">View profile</Link> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {connectionSuggestions.length ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-ink">Suggestions</p>
                        {connectionSuggestions.slice(0, 4).map((suggestion) => (
                          <div key={suggestion.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-bg px-4 py-4">
                            <div>
                              <p className="font-bold text-ink">{toDisplayName(suggestion)}</p>
                              <p className="text-xs text-muted">{suggestion.specialty || suggestion.role || 'Member'}</p>
                            </div>
                            <button type="button" onClick={() => requestConnection(suggestion.id).then(() => setConnectionSuggestions((current) => current.filter((entry) => entry.id !== suggestion.id))).catch(() => setGlobalError('Could not send the connection request.'))} className="btn-outline px-4 py-2 text-xs">Connect</button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!incomingRequests.length && !acceptedConnections.length && !connectionSuggestions.length ? (
                      <EmptyState title="No connections yet" body="Once you connect with other members, your network and pending requests will show up here." />
                    ) : null}
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'Timeline' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              {isOwnProfile ? (
                <SectionCard title="Share an update">
                  <textarea
                    value={newPostText}
                    onChange={(event) => setNewPostText(event.target.value)}
                    rows={5}
                    className="w-full rounded-[20px] border border-border bg-bg px-4 py-4 text-sm text-ink outline-none"
                    placeholder="Share progress, wins, or what you're working on."
                  />
                  {newPostImage ? (
                    <div className="mt-4 overflow-hidden rounded-[20px] border border-border bg-bg">
                      <img src={newPostImage} alt={newPostImageName || 'Timeline upload'} className="max-h-[360px] w-full object-cover" />
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => postImageInputRef.current?.click()} className="btn-outline inline-flex items-center gap-2 px-4 py-3 text-sm">
                        <Camera size={16} />
                        {newPostImage ? 'Replace image' : 'Add image'}
                      </button>
                      {newPostImage ? <button type="button" onClick={() => { setNewPostImage(''); setNewPostImageName(''); }} className="text-xs font-bold text-muted">Remove</button> : null}
                    </div>
                    <button type="button" onClick={handleCreatePost} disabled={isPosting} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm">
                      {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Publish
                    </button>
                  </div>
                  <input ref={postImageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImagePick(event, 'post')} />
                </SectionCard>
              ) : null}

              <SectionCard title="Timeline">
                <div className="space-y-4">
                  {timelinePosts.length ? timelinePosts.map((post) => (
                    <article key={post.id} className="rounded-[22px] border border-border bg-bg p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-ink">{post.authorName?.trim() || post.authorUsername?.trim() || displayName}</p>
                          <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                        <button type="button" onClick={() => handleToggleLike(post.id)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${post.likedByViewer ? 'bg-accent-orange text-white' : 'border border-border text-muted hover:text-ink'}`}>
                          {post.likedByViewer ? 'Liked' : 'Like'} · {post.likesCount}
                        </button>
                      </div>
                      {post.content ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink/90">{post.content}</p> : null}
                      {post.imageUrl ? <img src={toApiAssetUrl(post.imageUrl)} alt="Post" className="mt-4 max-h-[420px] w-full rounded-[20px] object-cover" referrerPolicy="no-referrer" /> : null}
                    </article>
                  )) : <EmptyState title="No timeline posts yet" body={isOwnProfile ? 'Share your first update to start building your profile timeline.' : 'This user has not shared anything on their timeline yet.'} />}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Reviews">
                <div className="space-y-4">
                  {reviews.length ? reviews.slice(0, 4).map((review) => (
                    <div key={review.id} className="rounded-[20px] border border-border bg-bg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-ink">{review.rating.toFixed(1)} / 5</p>
                        <p className="text-xs text-muted">{formatRelativeTime(review.createdAt)}</p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-muted">{review.comment || 'No written feedback provided.'}</p>
                    </div>
                  )) : <EmptyState title="No reviews yet" body="Completed collaborations and delivered work will show up here once reviews are submitted." />}
                </div>
              </SectionCard>

              {isOwnProfile && bountyDashboard ? (
                <SectionCard title="Bounties snapshot">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-border bg-bg p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Posted</p>
                      <p className="mt-2 text-2xl font-black text-ink">{bountyDashboard.posted.length}</p>
                    </div>
                    <div className="rounded-[18px] border border-border bg-bg p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Participations</p>
                      <p className="mt-2 text-2xl font-black text-ink">{bountyDashboard.participations.length}</p>
                    </div>
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'Projects' ? (
          <SectionCard title={isClient ? 'Posted projects' : 'Completed and active projects'}>
            <div className="grid gap-4 lg:grid-cols-2">
              {projects.length ? projects.map((project) => (
                <div key={project.id} className="rounded-[22px] border border-border bg-bg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">{project.category}</p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-ink">{project.title}</h3>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{project.status}</span>
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted">{project.description}</p>
                  <div className="mt-5 flex items-center justify-between text-sm font-bold text-ink">
                    <span>{project.tokenType}</span>
                    <span>{project.budget || 0}</span>
                  </div>
                </div>
              )) : <div className="lg:col-span-2"><EmptyState title="No projects yet" body={isOwnProfile ? 'Projects you post or complete will appear here.' : 'This profile has no visible projects yet.'} /></div>}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'Friends' ? (
          <SectionCard title={isOwnProfile ? 'Your network' : 'Connections'}>
            <div className="grid gap-4 lg:grid-cols-2">
              {acceptedConnections.length ? acceptedConnections.map((connection) => (
                <div key={connection.id} className="rounded-[22px] border border-border bg-bg p-5">
                  <p className="text-lg font-black tracking-tight text-ink">{toDisplayName(connection.otherUser)}</p>
                  <p className="mt-2 text-sm text-muted">{connection.otherUser?.specialty || connection.otherUser?.role || 'Member'}</p>
                  {connection.otherUser?.username ? <Link to={`/profile/${connection.otherUser.username}`} className="mt-4 inline-flex text-sm font-bold text-accent-orange">Open profile</Link> : null}
                </div>
              )) : <div className="lg:col-span-2"><EmptyState title="No connections yet" body={isOwnProfile ? 'Connect with clients and freelancers to build your network.' : 'There are no public connection details to show for this profile yet.'} /></div>}
            </div>
            {isOwnProfile && outgoingRequests.length ? (
              <div className="mt-6 rounded-[22px] border border-border bg-bg p-5">
                <p className="text-sm font-bold text-ink">Outgoing requests</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {outgoingRequests.map((connection) => (
                    <span key={connection.id} className="rounded-full border border-border px-4 py-2 text-sm text-muted">{toDisplayName(connection.otherUser)}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {activeTab === 'NFTs' ? (
          <SectionCard title="Reputation NFTs">
            <div className="grid gap-4 lg:grid-cols-3">
              {nfts.length ? nfts.map((nft) => (
                <div key={nft.id} className="rounded-[22px] border border-border bg-bg p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">{nft.nftType.replace(/_/g, ' ')}</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-ink">{nft.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{nft.description || 'A reputation NFT earned through platform activity and contribution.'}</p>
                  <div className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-muted">{nft.minted ? 'Minted' : 'Pending mint'}</div>
                </div>
              )) : <div className="lg:col-span-3"><EmptyState title="No NFTs yet" body="Reputation NFTs earned from milestones, consistency, and community impact will appear here." /></div>}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
