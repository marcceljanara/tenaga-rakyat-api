// User Management Models
export class UserListQueryRequest {
  page?: number;
  limit?: number;
  role?: string;
  verification_status?: string;
  search?: string;
}

export class UpdateUserVerificationRequest {
  verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export class SuspendUserWalletRequest {
  reason?: string;
}

export class UserDetailResponse {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  role: string;
  profile_picture_url?: string;
  about?: string;
  cv_url?: string;
  verification_status: string;
  average_rating?: string;
  is_suspended: string;
  is_deleted: string;
  wallet?: {
    id: string;
    balance: string;
    status: string;
  };
  created_at: Date;
  updated_at: Date;
}
export class UserResponse {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  role: string;
  verification_status: string;
  wallet?: {
    status: string;
  };
  is_suspended: boolean;
}

export class UserListResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export class UserStatsResponse {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  pending_verification: number;
  rejected_verification: number;
  workers: number;
  job_providers: number;
}
