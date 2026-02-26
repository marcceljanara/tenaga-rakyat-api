export class CreateReviewDto {
  job_id: number;
  rating: number;
  comment: string;
  is_anonymous: boolean;
}

export class UpdateReviewDto {
  rating?: number;
  comment?: string;
  is_anonymous?: boolean;
}

export class ReviewResponse {
  id: number;
  job_id: number;
  reviewer_id: number;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  created_at: Date;
  updated_at: Date;
}
