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
  phone_number?: string;
  email?: string;
  role?: number;
  profile_picture_url?: string;
  verification_status?: string;
  ktp_number_encrypted?: string;
  average_rating?: number;
  created_at?: string;
  update_at?: string;
}
