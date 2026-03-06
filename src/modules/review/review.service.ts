import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewResponse,
  ReviewListResponse,
} from '../../model/review.model';
import { ReviewValidation } from './review.validation';
import { JobStatus, Prisma, ReviewType } from '@prisma/client';
import { ROLES } from '../../common/role/role';

@Injectable()
export class ReviewService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) { }

  /**
   * Create a review for a completed/approved job.
   * - Provider reviews Worker (PROVIDER_TO_WORKER)
   * - Worker reviews Provider (WORKER_TO_PROVIDER)
   */
  async createReview(
    userId: string,
    roleId: number,
    request: CreateReviewRequest,
  ): Promise<ReviewResponse> {
    this.logger.debug(`User ${userId} creating review for job ${request.job_id}`);

    const validated = this.validationService.validate(
      ReviewValidation.CREATE_REVIEW,
      request,
    );

    // Fetch the job with provider and worker info
    const job = await this.prismaService.job.findUnique({
      where: { id: validated.job_id },
      select: {
        id: true,
        title: true,
        status: true,
        provider_id: true,
        worker_id: true,
      },
    });

    if (!job) {
      throw new HttpException('Pekerjaan tidak ditemukan', 404);
    }

    // Only APPROVED jobs can be reviewed
    if (job.status !== JobStatus.APPROVED) {
      throw new HttpException(
        'Hanya pekerjaan dengan status APPROVED yang dapat di-review',
        400,
      );
    }

    if (!job.worker_id) {
      throw new HttpException(
        'Pekerjaan ini tidak memiliki pekerja yang ditugaskan',
        400,
      );
    }

    // Determine review direction
    let reviewType: ReviewType;
    let revieweeId: string;

    if (job.provider_id === userId) {
      // Provider reviewing the worker
      reviewType = ReviewType.PROVIDER_TO_WORKER;
      revieweeId = job.worker_id;
    } else if (job.worker_id === userId) {
      // Worker reviewing the provider
      reviewType = ReviewType.WORKER_TO_PROVIDER;
      revieweeId = job.provider_id;
    } else {
      throw new HttpException(
        'Anda tidak terlibat dalam pekerjaan ini',
        403,
      );
    }

    // Check if review already exists for this job + review_type
    const existingReview = await this.prismaService.review.findUnique({
      where: {
        job_id_review_type: {
          job_id: validated.job_id,
          review_type: reviewType,
        },
      },
    });

    if (existingReview) {
      throw new HttpException(
        'Anda sudah memberikan review untuk pekerjaan ini',
        400,
      );
    }

    // Create review and recalculate average rating in a transaction
    const review = await this.prismaService.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          job_id: validated.job_id,
          reviewer_id: userId,
          reviewee_id: revieweeId,
          rating: validated.rating,
          comment: validated.comment,
          review_type: reviewType,
          is_anonymous: validated.is_anonymous,
        },
        include: {
          reviewer: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          reviewee: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          job: {
            select: { id: true, title: true },
          },
        },
      });

      // Recalculate average rating for the reviewee
      await this.recalculateAverageRating(tx, revieweeId);

      return newReview;
    });

    return this.mapToReviewResponse(review);
  }

  /**
   * Update own review
   */
  async updateReview(
    reviewId: number,
    userId: string,
    request: UpdateReviewRequest,
  ): Promise<ReviewResponse> {
    this.logger.debug(`User ${userId} updating review ${reviewId}`);

    const validated = this.validationService.validate(
      ReviewValidation.UPDATE_REVIEW,
      request,
    );

    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new HttpException('Review tidak ditemukan', 404);
    }

    if (review.reviewer_id !== userId) {
      throw new HttpException(
        'Anda tidak memiliki akses untuk mengubah review ini',
        403,
      );
    }

    if (review.deleted_at) {
      throw new HttpException('Review sudah dihapus', 400);
    }

    const updatedReview = await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...(validated.rating !== undefined && { rating: validated.rating }),
          ...(validated.comment !== undefined && { comment: validated.comment }),
          ...(validated.is_anonymous !== undefined && {
            is_anonymous: validated.is_anonymous,
          }),
        },
        include: {
          reviewer: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          reviewee: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          job: {
            select: { id: true, title: true },
          },
        },
      });

      // Recalculate if rating changed
      if (validated.rating !== undefined) {
        await this.recalculateAverageRating(tx, review.reviewee_id);
      }

      return updated;
    });

    return this.mapToReviewResponse(updatedReview);
  }

  /**
   * Get reviews received by a user
   */
  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ReviewListResponse> {
    this.logger.debug(`Getting reviews for user ${userId}`);

    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      reviewee_id: userId,
      deleted_at: null,
    };

    const [reviews, total] = await Promise.all([
      this.prismaService.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          reviewer: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          reviewee: {
            select: { id: true, full_name: true, profile_picture_url: true },
          },
          job: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prismaService.review.count({ where }),
    ]);

    return {
      reviews: reviews.map((r) => this.mapToReviewResponse(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get reviews for a specific job (both directions)
   */
  async getJobReviews(jobId: number): Promise<ReviewResponse[]> {
    this.logger.debug(`Getting reviews for job ${jobId}`);

    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Pekerjaan tidak ditemukan', 404);
    }

    const reviews = await this.prismaService.review.findMany({
      where: {
        job_id: jobId,
        deleted_at: null,
      },
      orderBy: { created_at: 'asc' },
      include: {
        reviewer: {
          select: { id: true, full_name: true, profile_picture_url: true },
        },
        reviewee: {
          select: { id: true, full_name: true, profile_picture_url: true },
        },
        job: {
          select: { id: true, title: true },
        },
      },
    });

    return reviews.map((r) => this.mapToReviewResponse(r));
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId: number): Promise<ReviewResponse> {
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: { id: true, full_name: true, profile_picture_url: true },
        },
        reviewee: {
          select: { id: true, full_name: true, profile_picture_url: true },
        },
        job: {
          select: { id: true, title: true },
        },
      },
    });

    if (!review || review.deleted_at) {
      throw new HttpException('Review tidak ditemukan', 404);
    }

    return this.mapToReviewResponse(review);
  }

  /**
   * Recalculate and persist average_rating for a user
   */
  private async recalculateAverageRating(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    const result = await tx.review.aggregate({
      where: {
        reviewee_id: userId,
        deleted_at: null,
      },
      _avg: { rating: true },
    });

    const avgRating = result._avg.rating
      ? Number(Number(result._avg.rating).toFixed(1))
      : null;

    await tx.user.update({
      where: { id: userId },
      data: { average_rating: avgRating },
    });
  }

  /**
   * Map Prisma review to response DTO.
   * Hides reviewer identity if is_anonymous is true.
   */
  private mapToReviewResponse(review: any): ReviewResponse {
    const isAnonymous = review.is_anonymous;

    return {
      id: review.id,
      job_id: review.job_id,
      review_type: review.review_type,
      rating: Number(review.rating),
      comment: review.comment,
      is_anonymous: review.is_anonymous,
      reviewer: isAnonymous
        ? { id: 'anonymous', full_name: 'Anonim', profile_picture_url: null }
        : review.reviewer
          ? {
            id: review.reviewer.id,
            full_name: review.reviewer.full_name,
            profile_picture_url: review.reviewer.profile_picture_url,
          }
          : undefined,
      reviewee: review.reviewee
        ? {
          id: review.reviewee.id,
          full_name: review.reviewee.full_name,
          profile_picture_url: review.reviewee.profile_picture_url,
        }
        : undefined,
      job: review.job
        ? { id: review.job.id, title: review.job.title }
        : undefined,
      created_at: review.created_at,
      updated_at: review.updated_at,
    };
  }
}
