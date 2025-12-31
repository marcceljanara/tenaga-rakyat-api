import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserListQueryRequest {
  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  verification_status?: string;

  @ApiPropertyOptional()
  search?: string;
}

export class UpdateUserVerificationRequest {
  @ApiProperty({ enum: ['UNVERIFIED', 'EMAIL_VERIFIED', 'FULL_VERIFIED'], example: 'EMAIL_VERIFIED' })
  verification_status: 'UNVERIFIED' | 'EMAIL_VERIFIED' | 'FULL_VERIFIED';
}

export class SuspendUserWalletRequest {
  @ApiPropertyOptional({ example: 'Suspicious activity detected', description: 'Reason for suspension' })
  reason?: string;
}

export class UserDetailResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  phone_number: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  profile_picture_url?: string;

  @ApiPropertyOptional()
  about?: string;

  @ApiPropertyOptional()
  cv_url?: string;

  @ApiProperty()
  verification_status: string;

  @ApiPropertyOptional()
  average_rating?: string;

  @ApiProperty()
  is_suspended: string;

  @ApiProperty()
  is_deleted: string;

  @ApiPropertyOptional()
  wallet?: {
    id: string;
    balance: string;
    status: string;
  };

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
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
  @ApiProperty({ type: [UserResponse] })
  users: UserResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class UserStatsResponse {
  @ApiProperty()
  total_users: number;

  @ApiProperty()
  email_verified_users: number;

  @ApiProperty()
  unverified_users: number;

  @ApiProperty()
  full_verified_users: number;

  @ApiProperty()
  workers: number;

  @ApiProperty()
  job_providers: number;
}