export class CreateJobRequest {
  title: string;
  description: string;
  location?: string;
  compensation_amount: number;
}

export class UpdateJobRequest {
  title?: string;
  description?: string;
  location?: string;
  compensation_amount?: number;
}

export class UpdateWorkerJobStatusRequest {
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export class JobResponse {
  id: number;
  provider_id: string;
  worker_id: string | null;
  title: string;
  description: string;
  location: string | null;
  compensation_amount: number;
  status: string;
  posted_at: Date;
  completed_at: Date | null;
  provider?: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    average_rating: number | null;
  };
  worker?: {
    id: string;
    full_name: string;
    profile_picture_url: string | null;
    average_rating: number | null;
  };
  _count?: {
    jobApplications: number;
  };
}

export class JobListResponse {
  jobs: JobResponse[];
  total: number;
  page: number;
  limit: number;
}

export class JobSearchQuery {
  keyword?: string;
  location?: string;
  min_compensation?: number;
  max_compensation?: number;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: 'posted_at' | 'compensation_amount' | 'title';
  sort_order?: 'asc' | 'desc';
}

export class ProviderJobHistoryQuery {
  status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  limit?: number;
  sort_by?: 'posted_at' | 'status';
  sort_order?: 'asc' | 'desc';
}
