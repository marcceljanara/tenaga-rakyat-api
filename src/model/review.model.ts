import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewRequest {
  @ApiProperty({ example: 1, description: 'Job ID to review' })
  job_id: number;

  @ApiProperty({
    example: 4.5,
    description: 'Rating (1.0 - 5.0, step 0.5)',
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiPropertyOptional({
    example: 'Sangat puas dengan hasil pekerjaan',
    description: 'Review comment',
  })
  comment?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Hide reviewer identity',
    default: false,
  })
  is_anonymous?: boolean;
}

export class UpdateReviewRequest {
  @ApiPropertyOptional({
    example: 4.0,
    description: 'Updated rating (1.0 - 5.0, step 0.5)',
  })
  rating?: number;

  @ApiPropertyOptional({
    example: 'Updated comment',
    description: 'Updated review comment',
  })
  comment?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Updated anonymous setting',
  })
  is_anonymous?: boolean;
}

export class ReviewerInfo {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  full_name?: string | null;

  @ApiPropertyOptional()
  profile_picture_url?: string | null;
}

export class ReviewResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  job_id: number;

  @ApiProperty()
  review_type: string;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  comment: string | null;

  @ApiProperty()
  is_anonymous: boolean;

  @ApiPropertyOptional()
  reviewer?: ReviewerInfo;

  @ApiPropertyOptional()
  reviewee?: ReviewerInfo;

  @ApiPropertyOptional()
  job?: {
    id: number;
    title: string;
  };

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class ReviewListResponse {
  @ApiProperty({ type: [ReviewResponse] })
  reviews: ReviewResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
