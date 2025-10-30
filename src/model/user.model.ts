export class RegisterUserRequest {
  full_name: string;
  phone_number: string;
  email: string;
  password: string;
  role_id: number;
}

export class EditUserRequest {
  full_name?: string;
  phone_number?: string;
  about?: string;
  cv_url?: string;
}

export class LoginUserRequest {
  email: string;
  password: string;
}

export class LoginUserResponse {
  access_token: string;
  refresh_token: string;
}

export class RefreshToken {
  refresh_token: string;
}

export class UserPhotoInProfile {
  id: string;
  photo_url: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export class UserResponse {
  id: string;
  full_name: string;
  phone_number?: string | null;
  email?: string | null;
  role?: string | null;
  profile_picture_url?: string | null;
  verification_status?: string | null;
  ktp_number_encrypted?: string | null;
  average_rating?: number | null;
  about?: string | null;
  cv_url?: string | null;
  photos?: UserPhotoInProfile[];
  created_at?: Date | null;
  update_at?: Date | null;
}
