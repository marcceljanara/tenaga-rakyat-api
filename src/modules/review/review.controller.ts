import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import {
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewResponse,
  ReviewListResponse,
} from '../../model/review.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { ROLES } from '../../common/role/role';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('/api/reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) { }

  /**
   * POST /api/reviews
   * Create a review for a completed job
   * Provider reviews Worker OR Worker reviews Provider
   */
  @Post()
  @HttpCode(201)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  @ApiOperation({
    summary: 'Create review',
    description:
      'Create a bidirectional review for an APPROVED job. Provider reviews the Worker (PROVIDER_TO_WORKER) or Worker reviews the Provider (WORKER_TO_PROVIDER). Review type is auto-determined from your role in the job.',
  })
  @ApiBody({ type: CreateReviewRequest })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Review berhasil dibuat' },
        data: { $ref: '#/components/schemas/ReviewResponse' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Job not APPROVED, already reviewed, or no worker' })
  @ApiResponse({ status: 403, description: 'Not involved in this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async createReview(
    @Auth() user: User,
    @Body() request: CreateReviewRequest,
  ): Promise<WebResponse<ReviewResponse>> {
    const result = await this.reviewService.createReview(
      user.id,
      user.role_id,
      request,
    );
    return {
      message: 'Review berhasil dibuat',
      data: result,
    };
  }

  /**
   * PUT /api/reviews/:reviewId
   * Update own review
   */
  @Put('/:reviewId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  @ApiOperation({
    summary: 'Update review',
    description: 'Update your own review (rating, comment, anonymous status)',
  })
  @ApiParam({ name: 'reviewId', type: Number, description: 'Review ID' })
  @ApiBody({ type: UpdateReviewRequest })
  @ApiResponse({
    status: 200,
    description: 'Review updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Review berhasil diperbarui' },
        data: { $ref: '#/components/schemas/ReviewResponse' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Review already deleted' })
  @ApiResponse({ status: 403, description: 'Not your review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateReview(
    @Auth() user: User,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() request: UpdateReviewRequest,
  ): Promise<WebResponse<ReviewResponse>> {
    const result = await this.reviewService.updateReview(
      reviewId,
      user.id,
      request,
    );
    return {
      message: 'Review berhasil diperbarui',
      data: result,
    };
  }


  /**
   * GET /api/reviews/:reviewId
   * Get a single review by ID
   */
  @Get('/:reviewId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({
    summary: 'Get review detail',
    description: 'Get a single review by its ID',
  })
  @ApiParam({ name: 'reviewId', type: Number, description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description: 'Review detail retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ReviewResponse' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReviewById(
    @Auth() user: User,
    @Param('reviewId', ParseIntPipe) reviewId: number,
  ): Promise<WebResponse<ReviewResponse>> {
    const result = await this.reviewService.getReviewById(reviewId);
    return {
      data: result,
    };
  }

  /**
   * GET /api/reviews/user/:userId
   * Get all reviews received by a specific user (public profile)
   */
  @Get('/user/:userId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({
    summary: 'Get user reviews',
    description: 'Get all reviews received by a user with pagination',
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'User reviews retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ReviewListResponse' },
      },
    },
  })
  async getUserReviews(
    @Auth() user: User,
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<WebResponse<ReviewListResponse>> {
    const result = await this.reviewService.getUserReviews(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
    return {
      data: result,
    };
  }

  /**
   * GET /api/reviews/job/:jobId
   * Get reviews for a specific job (both directions)
   */
  @Get('/job/:jobId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({
    summary: 'Get job reviews',
    description: 'Get all reviews for a specific job (both provider-to-worker and worker-to-provider)',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job reviews retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ReviewResponse' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobReviews(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<WebResponse<ReviewResponse[]>> {
    const result = await this.reviewService.getJobReviews(jobId);
    return {
      data: result,
    };
  }
}
