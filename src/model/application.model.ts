export class ApplyJobRequest {
  cover_letter: string;
}

export class UpdateApplicationStatusRequest {
  status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW';
}

export class ApplicationResponse {
  id: number;
  job_id: number;
  worker_id: string;
  cover_letter: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  job?: {
    id: number;
    title: string;
    description: string;
    location: string | null;
    compensation_amount: number;
    status: string;
    provider: {
      id: string;
      full_name: string;
      profile_picture_url: string | null;
      average_rating: number | null;
    };
  };
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
  applications: ApplicationResponse[];
  total: number;
  page: number;
  limit: number;
}

export class ApplicationStatisticsResponse {
  job_id: number;
  job_title: string;
  total_applications: number;
  pending_count: number;
  accepted_count: number;
  rejected_count: number;
  under_review_count: number;
  latest_application_date: Date | null;
}

export class SearchApplicationQuery {
  keyword?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'status';
  sort_order?: 'asc' | 'desc';
}
