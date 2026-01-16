import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobRequest {
  @ApiProperty({
    example: 'I am very interested in this position...',
    description: 'Cover letter for application',
  })
  cover_letter: string;
}

export class UpdateApplicationStatusRequest {
  @ApiProperty({
    enum: ['ACCEPTED', 'REJECTED', 'UNDER_REVIEW'],
    example: 'ACCEPTED',
  })
  status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW';
}

export class ApplicationResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  job_id: number;

  @ApiProperty()
  worker_id: string;

  @ApiProperty()
  cover_letter: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiPropertyOptional()
  job?: {
    id: number;
    title: string;
    description: string;
    location: string | null;
    compensation_amount: number;
    status: string;
    payment_method: string;
    provider: {
      id: string;
      full_name: string;
      profile_picture_url: string | null;
      average_rating: number | null;
    };
  };

  @ApiPropertyOptional()
  worker?: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    profile_picture_url: string | null;
    about: string | null;
    cv_url: string | null;
    average_rating: number | null;
    verification_status: string;
  };
}

export class ApplicationListResponse {
  @ApiProperty({ type: [ApplicationResponse] })
  applications: ApplicationResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class ApplicationStatisticsResponse {
  @ApiProperty()
  job_id: number;

  @ApiProperty()
  job_title: string;

  @ApiProperty()
  total_applications: number;

  @ApiProperty()
  pending_count: number;

  @ApiProperty()
  accepted_count: number;

  @ApiProperty()
  rejected_count: number;

  @ApiProperty()
  under_review_count: number;

  @ApiPropertyOptional()
  latest_application_date: Date | null;
}

export class SearchApplicationQuery {
  @ApiPropertyOptional()
  keyword?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['created_at', 'updated_at', 'status'] })
  sort_by?: 'created_at' | 'updated_at' | 'status';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  sort_order?: 'asc' | 'desc';
}
