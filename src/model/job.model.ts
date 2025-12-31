import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobRequest {
  @ApiProperty({ example: 'Web Developer Needed', description: 'Job title' })
  title: string;

  @ApiProperty({ example: 'We need an experienced web developer...', description: 'Job description' })
  description: string;

  @ApiPropertyOptional({ example: 'Jakarta', description: 'Job location' })
  location?: string;

  @ApiProperty({ example: 5000000, description: 'Compensation amount in IDR' })
  compensation_amount: number;
}

export class UpdateJobRequest {
  @ApiPropertyOptional({ example: 'Senior Web Developer', description: 'Updated job title' })
  title?: string;

  @ApiPropertyOptional({ example: 'Updated job description...', description: 'Updated description' })
  description?: string;

  @ApiPropertyOptional({ example: 'Bandung', description: 'Updated location' })
  location?: string;

  @ApiPropertyOptional({ example: 6000000, description: 'Updated compensation' })
  compensation_amount?: number;
}

export class UpdateWorkerJobStatusRequest {
  @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETED'], example: 'IN_PROGRESS' })
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export class UpdateEmployerJobStatusRequest {
  @ApiProperty({ enum: ['CANCELLED', 'APPROVED', 'REJECTED'], example: 'APPROVED' })
  status: 'CANCELLED' | 'APPROVED' | 'REJECTED';
}

export class JobResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  provider_id: string;

  @ApiPropertyOptional()
  worker_id: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  location: string | null;

  @ApiProperty()
  compensation_amount: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  posted_at: Date;

  @ApiPropertyOptional()
  completed_at: Date | null;

  @ApiPropertyOptional()
  provider?: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    average_rating: number | null;
    phone_number: string | null;
  };

  @ApiPropertyOptional()
  worker?: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    average_rating: number | null;
  };

  @ApiPropertyOptional()
  _count?: {
    jobApplications: number;
  };
}

export class JobListResponse {
  @ApiProperty({ type: [JobResponse] })
  jobs: JobResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class JobSearchQuery {
  @ApiPropertyOptional()
  keyword?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  min_compensation?: number;

  @ApiPropertyOptional()
  max_compensation?: number;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['posted_at', 'compensation_amount', 'title'] })
  sort_by?: 'posted_at' | 'compensation_amount' | 'title';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  sort_order?: 'asc' | 'desc';
}

export class ProviderJobHistoryQuery {
  @ApiPropertyOptional({ enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['posted_at', 'status'] })
  sort_by?: 'posted_at' | 'status';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  sort_order?: 'asc' | 'desc';
}