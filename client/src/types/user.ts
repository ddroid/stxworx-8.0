export type UserRole = 'client' | 'freelancer';

export interface ApiUserProfile {
  id: number;
  stxAddress: string;
  username?: string | null;
  name?: string | null;
  role: UserRole | null;
  isActive: boolean;
  totalEarned?: string | number | null;
  specialty?: string | null;
  hourlyRate?: string | null;
  about?: string | null;
  skills?: string[] | null;
  portfolio?: string[] | null;
  company?: string | null;
  projectInterests?: string[] | null;
  avatar?: string | null;
  coverImage?: string | null;
  city?: string | null;
  country?: string | null;
  language?: string | null;
  createdAt?: string;
}

export interface ApiUsernameAvailability {
  username: string;
  available: boolean;
}

export interface ApiUserReview {
  id: number;
  projectId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string | null;
  createdAt?: string;
}

export interface AuthenticatedUser {
  id: number;
  stxAddress: string;
  username?: string | null;
  name?: string | null;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthenticatedUserResponse {
  user: AuthenticatedUser;
}
