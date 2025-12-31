import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Admin Management Models
export class CreateAdminRequest {
  @ApiProperty({ example: 'John Doe', description: 'Admin full name' })
  full_name: string;

  @ApiProperty({ example: '+628123456789', description: 'Phone number' })
  phone_number: string;

  @ApiProperty({ example: 'admin@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 characters)' })
  password: string;
}

export class UpdateAdminRequest {
  @ApiPropertyOptional({ example: 'John Doe Updated', description: 'Updated full name' })
  full_name?: string;

  @ApiPropertyOptional({ example: '+628123456789', description: 'Updated phone number' })
  phone_number?: string;

  @ApiPropertyOptional({ example: 'newemail@example.com', description: 'Updated email' })
  email?: string;
}

export class ChangeAdminPasswordRequest {
  @ApiProperty({ example: 'NewSecurePass123!', description: 'New password' })
  new_password: string;
}

export class AdminResponse {
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

  @ApiProperty()
  verification_status: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class AdminListResponse {
  @ApiProperty({ type: [AdminResponse] })
  admins: AdminResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
