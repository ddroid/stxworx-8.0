import type { ApiLeaderboardEntry } from '../types/leaderboard';
import type { ApiCategory, ApiProject, ApiRefundRecord, ApiRefundSummary, ApiUploadedMediaItem, AppJob, AppJobMilestone } from '../types/job';
import type { AuthenticatedUserResponse, ApiUserProfile, ApiUserReview, ApiUsernameAvailability, UserRole } from '../types/user';
import { decodeSocialPostId, encodeSocialPostId } from '@shared/social-post-permalink';

// Re-export types for convenience
export type { ApiProject, ApiCategory, ApiUploadedMediaItem, AppJob, AppJobMilestone, ApiRefundRecord, ApiRefundSummary };

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const API_BASE_URL = rawBase.endsWith('/api')
  ? rawBase.replace(/\/$/, '')
  : `${rawBase.replace(/\/$/, '')}/api`;
const CANONICAL_WEB_ORIGIN = 'https://stxworx.com';

type RequestOptions = RequestInit & {
  searchParams?: Record<string, string | number | undefined | null>;
};

export interface GenerateAiTextInput {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  model?: string;
}

export interface WalletVerificationInput {
  stxAddress: string;
  publicKey: string;
  signature: string;
  message: string;
  role: UserRole;
  referralCode?: string;
}

export interface ApiReferralLeaderboardEntry {
  id: number;
  stxAddress: string;
  name?: string | null;
  username?: string | null;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalPayoutUsd: number;
  createdAt?: string;
  rank: number;
}

export interface ApiReferralCode {
  id: number;
  ownerId: number;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSharedAt?: string | null;
}

export interface ApiReferralProgramReferral {
  id: number;
  status: 'pending' | 'qualified' | 'blocked';
  referredUser: {
    id: number;
    stxAddress: string;
    name?: string | null;
    username?: string | null;
    role: UserRole;
  } | null;
  firstProjectId?: number | null;
  firstEscrowProjectId?: number | null;
  firstCompletedProjectId?: number | null;
  qualifiedProjectId?: number | null;
  totalCompletedJobs: number;
  cumulativeCompletedSpendUsd: string;
  firstCompletedSpendUsd?: string | null;
  qualificationRule?: string | null;
  blockedReason?: string | null;
  firstSeenAt?: string;
  qualifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiReferralProgramPayout {
  id: number;
  attributionId: number;
  projectId?: number | null;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  amountUsd: string;
  eligibleSpendUsd: string;
  payoutRate: string;
  payoutCurrency: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
}

export interface ApiReferralProgramOverview {
  code: ApiReferralCode | null;
  summary: {
    totalReferrals: number;
    qualifiedReferrals: number;
    pendingReferrals: number;
    blockedReferrals: number;
    totalPayoutUsd: string;
    pendingPayoutUsd: string;
    paidPayoutUsd: string;
  };
  referrals: ApiReferralProgramReferral[];
  payouts: ApiReferralProgramPayout[];
  policy: {
    firstJobMinimumUsd: number;
    totalSpendMinimumUsd: number;
    payoutRate: number;
  };
}

export interface ApiProposal {
  id: number;
  projectId: number;
  freelancerId: number;
  coverLetter: string;
  proposedAmount: string;
  attachments?: ApiUploadedMediaItem[] | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt?: string;
  updatedAt?: string;
  freelancerAddress?: string;
  freelancerUsername?: string | null;
  freelancerName?: string | null;
}

export interface ApiMilestoneSubmission {
  id: number;
  projectId: number;
  milestoneNum: number;
  freelancerId: number;
  deliverableUrl: string;
  description?: string | null;
  status: 'submitted' | 'approved' | 'rejected' | 'disputed';
  completionTxId?: string | null;
  releaseTxId?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
}

export interface ApiNotification {
  id: number;
  userId: number;
  type:
    | 'milestone_submitted'
    | 'milestone_approved'
    | 'milestone_rejected'
    | 'dispute_filed'
    | 'dispute_resolved'
    | 'refund_requested'
    | 'refund_approved'
    | 'refund_refunded'
    | 'proposal_received'
    | 'proposal_accepted'
    | 'connection_request_received'
    | 'connection_request_accepted'
    | 'connection_request_declined'
    | 'connection_request_cancelled'
    | 'connection_removed'
    | 'review_received'
    | 'project_completed';
  title: string;
  message: string;
  projectId?: number | null;
  isRead: boolean;
  createdAt?: string;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  attachments?: ApiUploadedMediaItem[];
  tokenType: 'STX' | 'sBTC' | 'USDCx';
  numMilestones: number;
  milestone1Title: string;
  milestone1Description?: string;
  milestone1Amount: string;
  milestone2Title?: string;
  milestone2Description?: string;
  milestone2Amount?: string;
  milestone3Title?: string;
  milestone3Description?: string;
  milestone3Amount?: string;
  milestone4Title?: string;
  milestone4Description?: string;
  milestone4Amount?: string;
}

export interface CreateProposalInput {
  projectId: number;
  coverLetter: string;
  proposedAmount: string;
  attachments?: ApiUploadedMediaItem[];
}

export interface UploadedMediaInput {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface SubmitMilestoneInput {
  projectId: number;
  milestoneNum: number;
  deliverableUrl: string;
  description?: string;
  completionTxId?: string;
}

export interface ApproveMilestoneInput {
  releaseTxId: string;
}

export interface CreateReviewInput {
  projectId: number;
  rating: number;
  comment?: string;
}

export interface UpdateMyProfileInput {
  name?: string;
  username?: string;
  specialty?: string;
  hourlyRate?: string;
  about?: string;
  skills?: string[];
  portfolio?: string[];
  company?: string;
  projectInterests?: string[];
  avatar?: string;
  coverImage?: string;
  city?: string;
  country?: string;
  language?: string;
}

export interface ApiAdmin {
  id: number;
  username: string;
  createdAt?: string;
}

export interface AdminAuthResponse {
  message: string;
  admin: ApiAdmin;
}

export interface ApiAdminDashboard {
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  refundedProjects: number;
  fundedProjects: number;
  openDisputes: number;
  resolvedDisputes: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  freelancerCount: number;
  clientCount: number;
}

export interface ApiDispute {
  id: number;
  projectId: number;
  milestoneNum: number;
  filedBy: number;
  reason: string;
  evidenceUrl?: string | null;
  status: 'open' | 'resolved' | 'reset';
  resolution?: string | null;
  resolvedBy?: number | null;
  disputeTxId?: string | null;
  resolutionTxId?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface AdminDisputeResolutionInput {
  resolution: string;
  resolutionTxId: string;
  favorFreelancer: boolean;
}

export interface RequestProjectRefundInput {
  reason?: string;
}

export interface ApproveProjectRefundInput {
  txId: string;
  note?: string;
}

export interface AdminRefundQueueItem extends ApiRefundRecord {
  project: ApiProject | null;
  refundSummary: ApiRefundSummary | null;
  configuredAdminPrincipal?: string | null;
}

export interface ApiSettings {
  userId: number;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  messagingOption: 'everyone' | 'clients_only' | 'connections_only';
  profileVisibility: 'public' | 'private';
  email?: string | null;
  emailVerified: boolean;
  emailVerificationSentAt?: string | null;
  emailVerifiedAt?: string | null;
  twitterHandle?: string | null;
  isTwitterConnected: boolean;
  twitterVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSocialComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  authorStxAddress?: string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  createdAt?: string;
}

export interface ApiConnection {
  id: number | null;
  connectionId: number | null;
  requesterId: number | null;
  addresseeId: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'removed' | null;
  direction: 'incoming' | 'outgoing' | 'none';
  relationshipState: 'none' | 'outgoing' | 'incoming' | 'accepted' | 'blocked' | 'disconnected';
  availableActions: Array<'send_request' | 'accept_request' | 'decline_request' | 'cancel_request' | 'remove_connection' | 'block_user' | 'unblock_user'>;
  otherUser?: Pick<ApiUserProfile, 'id' | 'stxAddress' | 'name' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'> | null;
  restriction?: {
    id: number;
    type: 'blocked';
    direction: 'incoming' | 'outgoing';
    reason?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  cancelledAt?: string | null;
  removedAt?: string | null;
}

export interface ApiConversation {
  id: number;
  participant?: Pick<ApiUserProfile, 'id' | 'stxAddress' | 'name' | 'username' | 'role' | 'avatar'> | null;
  lastMessage: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface ApiConversationAttachmentInput {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface ApiConversationMessage {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSize?: number | null;
  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  updatedAt?: string;
  deletedAt?: string | null;
  createdAt?: string;
  senderAddress?: string;
  senderName?: string | null;
  senderUsername?: string | null;
  senderRole?: UserRole;
}

export interface ApiBounty {
  id: number;
  createdById: number;
  title: string;
  description: string;
  links?: string | null;
  reward: string;
  status: 'open' | 'completed' | 'cancelled';
  creatorAddress?: string;
  creatorName?: string | null;
  creatorUsername?: string | null;
  submissionCount: number;
  hasParticipated: boolean;
  mySubmissionStatus?: 'pending' | 'approved' | 'rejected' | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiBountyParticipation {
  id: number;
  bountyId: number;
  description: string;
  links?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  bountyTitle?: string | null;
  reward?: string | null;
}

export interface ApiBountyDashboard {
  posted: ApiBounty[];
  participations: ApiBountyParticipation[];
}

export interface ApiSocialPost {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string | null;
  isPinned?: boolean;
  authorStxAddress?: string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  likedByViewer: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SocialPostSortOption = 'recent' | 'oldest' | 'likes' | 'views';

export type SocialPostRangeOption = 'all' | 'week' | 'month' | 'year';

export type SocialPostsQuery = {
  query?: string;
  tag?: string;
  sort?: SocialPostSortOption;
  range?: SocialPostRangeOption;
  limit?: number;
};

export type ApiMentionableUser = Pick<ApiUserProfile, 'id' | 'stxAddress' | 'name' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'>;

export interface ApiReputationNft {
  id: number;
  recipientId: number;
  nftType: 'milestone_streak' | 'top_freelancer' | 'top_client' | 'loyalty' | 'custom';
  name: string;
  description?: string | null;
  metadataUrl?: string | null;
  mintTxId?: string | null;
  minted: boolean;
  issuedBy: number;
  createdAt?: string;
}

export interface ApiPlatformConfig {
  id: number;
  daoFeePercentage: string;
  daoWalletAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

 type DisplayableIdentity = {
   name?: string | null;
   username?: string | null;
   stxAddress?: string | null;
 };

function buildUrl(path: string, searchParams?: RequestOptions['searchParams']) {
  const base = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!searchParams) {
    return base;
  }

  const url = new URL(base, window.location.origin);
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  if (base.startsWith('http://') || base.startsWith('https://')) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { searchParams, headers, ...init } = options;
  const requestUrl = buildUrl(path, searchParams);
  const requestHeaders = {
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  };

  let response = await fetch(requestUrl, {
    credentials: 'include',
    ...init,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {}

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function numericValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatAddress(address?: string | null) {
  if (!address) {
    return '';
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function toDisplayName(
  user?: DisplayableIdentity | null,
) {
  if (!user) {
    return 'Anonymous User';
  }

  return user.name?.trim() || user.username?.trim() || formatAddress(user.stxAddress) || 'Anonymous User';
}

export function toHandle(
  user?: DisplayableIdentity | null,
) {
  if (!user) {
    return '@unknown';
  }

  if (user.username?.trim()) {
    return `@${user.username.trim().toLowerCase().replace(/\s+/g, '_')}`;
  }

  return `@${formatAddress(user.stxAddress).replace(/\.\.\./g, '_')}`;
}

export function getUserProfilePath(
  user?: DisplayableIdentity | null,
) {
  if (!user) {
    return '/profile';
  }

  if (user.username?.trim()) {
    return `/profile/${encodeURIComponent(user.username.trim().toLowerCase())}`;
  }

  if (user.stxAddress?.trim()) {
    return `/profile/w/${encodeURIComponent(user.stxAddress.trim())}`;
  }

  return '/profile';
}

export function resolveSocialPostId(postIdOrPermalink: number | string) {
  if (typeof postIdOrPermalink === 'number') {
    return Number.isInteger(postIdOrPermalink) && postIdOrPermalink > 0 ? postIdOrPermalink : null;
  }

  return decodeSocialPostId(postIdOrPermalink);
}

export function getSocialPostPath(postId: number) {
  return `/post/${encodeSocialPostId(postId)}`;
}

export function getSocialPostsPagePath(query?: SocialPostsQuery) {
  const searchParams = new URLSearchParams();

  if (query?.query?.trim()) {
    searchParams.set('query', query.query.trim());
  }

  if (query?.tag?.trim()) {
    searchParams.set('tag', query.tag.trim().replace(/^#/, ''));
  }

  if (query?.sort) {
    searchParams.set('sort', query.sort);
  }

  if (query?.range) {
    searchParams.set('range', query.range);
  }

  const suffix = searchParams.toString();
  return suffix ? `/posts?${suffix}` : '/posts';
}

export function getSocialPostShareUrl(postId: number) {
  const path = getSocialPostPath(postId);

  return new URL(path, CANONICAL_WEB_ORIGIN).toString();
}

export function getReferralShareUrl(code: string) {
  const url = new URL('/', CANONICAL_WEB_ORIGIN);
  url.searchParams.set('ref', code);
  return url.toString();
}

export function toApiAssetUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (rawBase.startsWith('http://') || rawBase.startsWith('https://')) {
    return new URL(value, rawBase.endsWith('/') ? rawBase : `${rawBase}/`).toString();
  }

  return value;
}

export function formatTokenAmount(value: string | number | null | undefined) {
  const amount = numericValue(value);

  if (!amount) {
    return '0';
  }

  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount < 0.01) {
    const preciseAmount = amount.toFixed(8).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return preciseAmount === '-0' ? '0' : preciseAmount;
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
}

export function formatRelativeTime(value?: string) {
  if (!value) {
    return 'Just now';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const intervals = [
    { unit: 'year', seconds: 60 * 60 * 24 * 365 },
    { unit: 'month', seconds: 60 * 60 * 24 * 30 },
    { unit: 'day', seconds: 60 * 60 * 24 },
    { unit: 'hour', seconds: 60 * 60 },
    { unit: 'minute', seconds: 60 },
  ] as const;

  for (const interval of intervals) {
    if (Math.abs(diffSeconds) >= interval.seconds) {
      return formatter.format(Math.round(diffSeconds / interval.seconds), interval.unit);
    }
  }

  return formatter.format(diffSeconds, 'second');
}

function getJobColor(tokenType: string) {
  switch (tokenType) {
    case 'STX':
      return 'text-accent-cyan';
    case 'sBTC':
      return 'text-accent-orange';
    default:
      return 'text-accent-pink';
  }
}

function getMilestones(project: ApiProject): AppJobMilestone[] {
  const milestoneDefs = [
    {
      title: project.milestone1Title,
      description: project.milestone1Description,
      amount: project.milestone1Amount,
    },
    {
      title: project.milestone2Title,
      description: project.milestone2Description,
      amount: project.milestone2Amount,
    },
    {
      title: project.milestone3Title,
      description: project.milestone3Description,
      amount: project.milestone3Amount,
    },
    {
      title: project.milestone4Title,
      description: project.milestone4Description,
      amount: project.milestone4Amount,
    },
  ]
    .slice(0, project.numMilestones ?? 4)
    .filter((milestone) => milestone.title || numericValue(milestone.amount) > 0);

  const total =
    numericValue(project.budget) || milestoneDefs.reduce((sum, milestone) => sum + numericValue(milestone.amount), 0);

  return milestoneDefs.map((milestone) => {
    const amount = numericValue(milestone.amount);
    const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;

    return {
      title: milestone.title || 'Milestone',
      description: milestone.description || 'Milestone deliverable',
      percentage,
      amount,
    };
  });
}

export function toAppJob(project: ApiProject): AppJob {
  const budget = numericValue(project.budget);
  const tags = [project.category, project.subcategory, project.tokenType].filter(Boolean) as string[];

  return {
    id: project.id,
    title: project.title,
    category: project.category,
    subCategory: project.subcategory || 'General',
    description: project.description.length > 140 ? `${project.description.slice(0, 137)}...` : project.description,
    fullDescription: project.description,
    tags: tags.slice(0, 3),
    budget: formatTokenAmount(budget),
    rawBudget: budget,
    currency: project.tokenType,
    color: getJobColor(project.tokenType),
    status: project.status,
    clientAddress: project.clientAddress,
    freelancerAddress: project.freelancerAddress,
    attachments: project.attachments || [],
    milestones: getMilestones(project),
  };
}

export async function getProjects(filters?: {
  category?: string;
  tokenType?: string;
  search?: string;
}) {
  return apiRequest<ApiProject[]>('/projects', {
    method: 'GET',
    searchParams: filters,
  });
}

export async function createProject(input: CreateProjectInput) {
  return apiRequest<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function uploadProjectAttachment(input: UploadedMediaInput) {
  return apiRequest<ApiUploadedMediaItem>('/projects/upload', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCategories() {
  return apiRequest<ApiCategory[]>('/categories', { method: 'GET' });
}

export async function getProject(projectId: number) {
  return apiRequest<ApiProject>(`/projects/${projectId}`, { method: 'GET' });
}

export async function getMyPostedProjects() {
  return apiRequest<ApiProject[]>('/projects/my/posted', { method: 'GET' });
}

export async function getMyActiveProjects() {
  return apiRequest<ApiProject[]>('/projects/my/active', { method: 'GET' });
}

export async function getMyCompletedProjects() {
  return apiRequest<ApiProject[]>('/projects/my/completed', { method: 'GET' });
}

export async function getLeaderboard() {
  return apiRequest<ApiLeaderboardEntry[]>('/users/leaderboard', { method: 'GET' });
}

export async function getReferralLeaderboard() {
  return apiRequest<ApiReferralLeaderboardEntry[]>('/referrals/leaderboard', { method: 'GET' });
}

export async function getMyReferralProgram() {
  return apiRequest<ApiReferralProgramOverview>('/referrals/me', { method: 'GET' });
}

export async function createOrShareReferralCode() {
  return apiRequest<ApiReferralCode>('/referrals/code', { method: 'POST' });
}

export async function updateProject(id: number, input: Partial<CreateProjectInput>) {
  return apiRequest<ApiProject>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: number) {
  return apiRequest<{ message: string }>(`/projects/${id}`, { method: 'DELETE' });
}

export async function getUserProfile(address: string) {
  return apiRequest<ApiUserProfile>(`/users/${address}`, { method: 'GET' });
}

export async function getUserProfileByUsername(username: string) {
  return apiRequest<ApiUserProfile>(`/users/username/${encodeURIComponent(username)}`, { method: 'GET' });
}

export async function searchUsersByUsername(query?: string, limit?: number) {
  return apiRequest<ApiMentionableUser[]>('/users/search', {
    method: 'GET',
    searchParams: { query, limit },
  });
}

export async function getUserProjects(address: string) {
  return apiRequest<ApiProject[]>(`/users/${address}/projects`, { method: 'GET' });
}

export async function getUserReviews(address: string) {
  return apiRequest<ApiUserReview[]>(`/users/${address}/reviews`, { method: 'GET' });
}

export async function getMyReviews() {
  return apiRequest<ApiUserReview[]>('/reviews/mine', { method: 'GET' });
}

export async function createReview(input: CreateReviewInput) {
  return apiRequest<ApiUserReview>('/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCurrentUser() {
  return apiRequest<AuthenticatedUserResponse>('/auth/me', { method: 'GET' });
}

export async function checkUsernameAvailability(username: string) {
  return apiRequest<ApiUsernameAvailability>('/users/username-availability', {
    method: 'GET',
    searchParams: { username },
  });
}

export async function updateMyProfile(input: UpdateMyProfileInput) {
  return apiRequest<ApiUserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function createProposal(input: CreateProposalInput) {
  return apiRequest<ApiProposal>('/proposals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function uploadProposalAttachment(input: UploadedMediaInput) {
  return apiRequest<ApiUploadedMediaItem>('/proposals/upload', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getProjectProposals(projectId: number) {
  return apiRequest<ApiProposal[]>(`/proposals/project/${projectId}`, { method: 'GET' });
}

export async function getMyProposals() {
  return apiRequest<ApiProposal[]>('/proposals/my', { method: 'GET' });
}

export async function acceptProposal(
  proposalId: number,
  input: { escrowTxId: string; onChainId?: number },
) {
  return apiRequest<ApiProposal>(`/proposals/${proposalId}/accept`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function rejectProposal(proposalId: number) {
  return apiRequest<ApiProposal>(`/proposals/${proposalId}/reject`, { method: 'PATCH' });
}

export async function withdrawProposal(proposalId: number) {
  return apiRequest<ApiProposal>(`/proposals/${proposalId}/withdraw`, { method: 'PATCH' });
}

export async function submitMilestone(input: SubmitMilestoneInput) {
  return apiRequest<ApiMilestoneSubmission>('/milestones/submit', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getProjectMilestones(projectId: number) {
  return apiRequest<ApiMilestoneSubmission[]>(`/milestones/project/${projectId}`, { method: 'GET' });
}

export async function approveMilestone(submissionId: number, input: ApproveMilestoneInput) {
  return apiRequest<ApiMilestoneSubmission>(`/milestones/${submissionId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function rejectMilestone(submissionId: number) {
  return apiRequest<ApiMilestoneSubmission>(`/milestones/${submissionId}/reject`, { method: 'PATCH' });
}

export async function getProjectRefundStatus(projectId: number) {
  return apiRequest<ApiRefundSummary>(`/refunds/project/${projectId}`, { method: 'GET' });
}

export async function requestProjectRefund(input: { projectId: number; reason?: string }) {
  return apiRequest<ApiRefundSummary>('/refunds/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cancelProjectRefund(projectId: number) {
  return apiRequest<ApiRefundSummary>(`/refunds/project/${projectId}/cancel`, { method: 'PATCH' });
}

export async function approveProjectRefund(projectId: number, input: ApproveProjectRefundInput) {
  return apiRequest<ApiRefundSummary>(`/refunds/project/${projectId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getAdminRefundQueue() {
  return apiRequest<AdminRefundQueueItem[]>('/refunds/admin/queue', { method: 'GET' });
}

export async function executeAdminProjectRefund(projectId: number, input: ApproveProjectRefundInput) {
  return apiRequest<ApiRefundSummary>(`/refunds/project/${projectId}/admin-refund`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getNotifications() {
  return apiRequest<ApiNotification[]>('/notifications', { method: 'GET' });
}

export async function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>('/notifications/unread-count', { method: 'GET' });
}

export async function markNotificationRead(notificationId: number) {
  return apiRequest<{ message: string }>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiRequest<{ message: string }>('/notifications/read-all', { method: 'PATCH' });
}

export async function clearNotifications() {
  return apiRequest<{ message: string }>('/notifications', { method: 'DELETE' });
}

export async function getSettings() {
  return apiRequest<ApiSettings>('/settings/me', { method: 'GET' });
}

export async function updateSettings(input: Partial<ApiSettings>) {
  return apiRequest<ApiSettings>('/settings/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function requestEmailVerification(email: string) {
  return apiRequest<{ message: string }>('/settings/email-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resendEmailVerification() {
  return apiRequest<{ message: string }>('/settings/email-verification/resend', {
    method: 'POST',
  });
}

export async function confirmEmailVerification(token: string) {
  return apiRequest<{ message: string; email?: string }>('/settings/confirm-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function removeEmail() {
  return apiRequest<{ message: string }>('/settings/email', {
    method: 'DELETE',
  });
}

// Twitter OAuth functions
export function initiateTwitterAuth() {
  // Redirect to backend OAuth endpoint
  window.location.href = `${API_BASE_URL}/auth/twitter`;
}

export async function disconnectTwitter() {
  return apiRequest<{ message: string }>('/auth/twitter/disconnect', {
    method: 'DELETE',
  });
}

export async function getConnections() {
  return apiRequest<ApiConnection[]>('/connections', { method: 'GET' });
}

export async function getConnectionSuggestions() {
  return apiRequest<Array<Pick<ApiUserProfile, 'id' | 'stxAddress' | 'name' | 'username' | 'role' | 'isActive' | 'specialty' | 'avatar'>>>('/connections/suggestions', { method: 'GET' });
}

export async function getConnectionRelationship(userId: number) {
  return apiRequest<ApiConnection>(`/connections/relationship/${userId}`, { method: 'GET' });
}

export async function requestConnection(userId: number) {
  return apiRequest<ApiConnection>('/connections/request', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function acceptConnection(connectionId: number) {
  return apiRequest<ApiConnection>(`/connections/${connectionId}/accept`, { method: 'PATCH' });
}

export async function declineConnection(connectionId: number) {
  return apiRequest<ApiConnection>(`/connections/${connectionId}/decline`, { method: 'PATCH' });
}

export async function cancelConnection(connectionId: number) {
  return apiRequest<ApiConnection>(`/connections/${connectionId}/cancel`, { method: 'PATCH' });
}

export async function removeConnection(connectionId: number) {
  return apiRequest<ApiConnection>(`/connections/${connectionId}/remove`, { method: 'PATCH' });
}

export async function blockUser(userId: number, reason?: string) {
  return apiRequest<ApiConnection>('/connections/block', {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  });
}

export async function unblockUser(restrictionId: number) {
  return apiRequest<ApiConnection>(`/connections/blocks/${restrictionId}/unblock`, { method: 'PATCH' });
}

export async function getConversations() {
  return apiRequest<ApiConversation[]>('/messages/conversations', { method: 'GET' });
}

export async function getUnreadMessageCount() {
  return apiRequest<{ count: number }>('/messages/unread-count', { method: 'GET' });
}

export async function startConversation(participantId: number, message?: string) {
  return apiRequest<{ id: number }>(`/messages/conversations`, {
    method: 'POST',
    body: JSON.stringify({ participantId, message }),
  });
}

export async function getConversationMessages(conversationId: number) {
  return apiRequest<ApiConversationMessage[]>(`/messages/conversations/${conversationId}/messages`, { method: 'GET' });
}

export async function sendConversationMessage(conversationId: number, body?: string, attachment?: ApiConversationAttachmentInput) {
  const normalizedBody = body?.trim();

  return apiRequest<ApiConversationMessage>(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body: normalizedBody || (attachment ? ' ' : body),
      attachment,
    }),
  });
}

export async function updateConversationMessage(conversationId: number, messageId: number, body: string) {
  return apiRequest<ApiConversationMessage>(`/messages/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

export async function deleteConversationMessage(conversationId: number, messageId: number) {
  return apiRequest<ApiConversationMessage>(`/messages/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });
}

export async function pinConversationMessage(conversationId: number, messageId: number, isPinned: boolean) {
  return apiRequest<ApiConversationMessage>(`/messages/conversations/${conversationId}/messages/${messageId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ isPinned }),
  });
}

export async function getBounties() {
  return apiRequest<ApiBounty[]>('/bounties', { method: 'GET' });
}

export async function getMyBountyDashboard() {
  return apiRequest<ApiBountyDashboard>('/bounties/my/dashboard', { method: 'GET' });
}

export async function createBounty(input: { title: string; description: string; links?: string; reward: string }) {
  return apiRequest<ApiBounty>('/bounties', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function participateInBounty(bountyId: number, input: { description: string; links?: string }) {
  return apiRequest<ApiBountyParticipation>(`/bounties/${bountyId}/participate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSocialPosts(address: string) {
  return apiRequest<ApiSocialPost[]>(`/social/${address}/posts`, { method: 'GET' });
}

export async function getSocialFeed(limit?: number) {
  return apiRequest<ApiSocialPost[]>('/social/feed', {
    method: 'GET',
    searchParams: { limit },
  });
}

export async function getSocialPostsDirectory(query?: SocialPostsQuery) {
  return apiRequest<ApiSocialPost[]>('/social/posts', {
    method: 'GET',
    searchParams: {
      query: query?.query,
      tag: query?.tag,
      sort: query?.sort,
      range: query?.range,
      limit: query?.limit,
    },
  });
}

export async function getSocialPost(postIdOrPermalink: number | string) {
  const postId = resolveSocialPostId(postIdOrPermalink);
  if (!postId) {
    throw new Error('Invalid post URL');
  }

  return apiRequest<ApiSocialPost>(`/social/posts/${postId}`, { method: 'GET' });
}

export async function getSocialPostComments(postIdOrPermalink: number | string) {
  const postId = resolveSocialPostId(postIdOrPermalink);
  if (!postId) {
    throw new Error('Invalid post URL');
  }

  return apiRequest<ApiSocialComment[]>(`/social/posts/${postId}/comments`, { method: 'GET' });
}

export async function createSocialPost(input: { content?: string; imageDataUrl?: string }) {
  return apiRequest<ApiSocialPost>('/social/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSocialPost(postId: number, input: { content: string }) {
  return apiRequest<ApiSocialPost>(`/social/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteSocialPost(postId: number) {
  return apiRequest<{ success: boolean }>(`/social/posts/${postId}`, {
    method: 'DELETE',
  });
}

export async function toggleSocialPostPin(postId: number) {
  return apiRequest<ApiSocialPost>(`/social/posts/${postId}/pin`, {
    method: 'PATCH',
  });
}

export async function createSocialPostComment(postId: number, input: { content: string }) {
  return apiRequest<ApiSocialComment>(`/social/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function toggleSocialPostLike(postId: number) {
  return apiRequest<{ likesCount: number; likedByViewer: boolean }>(`/social/posts/${postId}/like`, { method: 'PATCH' });
}

export async function getMyNfts() {
  return apiRequest<ApiReputationNft[]>('/nfts/me', { method: 'GET' });
}

export async function getUserNfts(address: string) {
  return apiRequest<ApiReputationNft[]>(`/nfts/user/${address}`, { method: 'GET' });
}

export async function adminLogin(input: { username: string; password: string }) {
  return apiRequest<AdminAuthResponse>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function adminLogout() {
  return apiRequest<{ message: string }>('/admin/logout', { method: 'POST' });
}

export async function getAdminMe() {
  return apiRequest<AdminAuthResponse>('/admin/me', { method: 'GET' });
}

export async function getAdminDashboard() {
  return apiRequest<ApiAdminDashboard>('/admin/dashboard', { method: 'GET' });
}

export async function getAdminPlatformConfig() {
  return apiRequest<ApiPlatformConfig>('/admin/config', { method: 'GET' });
}

export async function updateAdminPlatformConfig(input: { daoFeePercentage?: string; daoWalletAddress?: string }) {
  return apiRequest<ApiPlatformConfig>('/admin/config', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getAdminUsers() {
  return apiRequest<ApiUserProfile[]>('/admin/users', { method: 'GET' });
}

export async function updateAdminUserStatus(userId: number, isActive: boolean) {
  return apiRequest<ApiUserProfile>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function getAdminDisputes() {
  return apiRequest<ApiDispute[]>('/admin/disputes', { method: 'GET' });
}

export async function resolveAdminDispute(disputeId: number, input: AdminDisputeResolutionInput) {
  return apiRequest<ApiDispute>(`/admin/disputes/${disputeId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function resetAdminDispute(disputeId: number, input: AdminDisputeResolutionInput) {
  return apiRequest<ApiDispute>(`/admin/disputes/${disputeId}/reset`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function generateAiText(input: GenerateAiTextInput) {
  return apiRequest<{ model: string; text: string }>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyWallet(input: WalletVerificationInput) {
  return apiRequest<AuthenticatedUserResponse>('/auth/verify-wallet', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutUser() {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
}

export async function submitContactForm(input: ContactFormInput) {
  return apiRequest<ContactFormResponse>('/contact', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
