export class RegisterUserRequest {
  full_name: string;
  phone_number: string;
  email: string;
  password: string;
  role_id: number;
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
  created_at?: Date | null;
  update_at?: Date | null;
}
