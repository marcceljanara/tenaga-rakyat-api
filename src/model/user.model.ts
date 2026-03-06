import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterUserRequest {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  full_name: string;

  @ApiProperty({ example: '+628123456789', description: 'Phone number' })
  phone_number: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 characters)',
  })
  password: string;

  @ApiProperty({
    example: 1,
    description: 'Role ID: 1 = Worker, 2 = Job Provider',
  })
  role_id: number;
}

export class EditUserRequest {
  @ApiPropertyOptional({
    example: 'John Doe Updated',
    description: 'Updated full name',
  })
  full_name?: string;

  @ApiPropertyOptional({
    example: '+628987654321',
    description: 'Updated phone number',
  })
  phone_number?: string;

  @ApiPropertyOptional({
    example: 'About me description...',
    description: 'User bio',
  })
  about?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/cv.pdf',
    description: 'CV URL',
  })
  cv_url?: string;

  @ApiPropertyOptional({
    example: 'Desa Mekar, Kecamatan Sukamaju',
    description: 'Location label',
  })
  location_label?: string;
}

export class UpdateLocationRequest {
  @ApiProperty({ example: -6.2, description: 'Latitude' })
  latitude: number;
  @ApiProperty({ example: 106.816666, description: 'Longitude' })
  longitude: number;
}

export class LoginUserRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password' })
  password: string;
}

export class LoginUserResponse {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;
}

export class RefreshToken {
  @ApiProperty()
  refresh_token: string;
}

export class UserPhotoInProfile {
  @ApiProperty()
  id: string;

  @ApiProperty()
  photo_url: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class UserResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  full_name: string;

  @ApiPropertyOptional()
  phone_number?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  role?: string | null;

  @ApiPropertyOptional()
  profile_picture_url?: string | null;

  @ApiPropertyOptional()
  verification_status?: string | null;

  @ApiPropertyOptional()
  ktp_number_encrypted?: string | null;

  @ApiPropertyOptional()
  average_rating?: number | null;

  @ApiPropertyOptional()
  about?: string | null;

  @ApiPropertyOptional()
  cv_url?: string | null;

  @ApiPropertyOptional()
  latitude?: number | null;

  @ApiPropertyOptional()
  longitude?: number | null;

  @ApiPropertyOptional()
  location_label?: string | null;

  @ApiPropertyOptional({ type: [UserPhotoInProfile] })
  photos?: UserPhotoInProfile[];

  @ApiPropertyOptional()
  created_at?: Date | null;

  @ApiPropertyOptional()
  update_at?: Date | null;
}
