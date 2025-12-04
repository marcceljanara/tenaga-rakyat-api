// Admin Management Models
export class CreateAdminRequest {
  full_name: string;
  phone_number: string;
  email: string;
  password: string;
}

export class UpdateAdminRequest {
  full_name?: string;
  phone_number?: string;
  email?: string;
}

export class ChangeAdminPasswordRequest {
  new_password: string;
}

export class AdminResponse {
  id: string;
  full_name: string;
  phone_number: string;
  email: string;
  role: string;
  profile_picture_url?: string;
  verification_status: string;
  created_at: Date;
  updated_at: Date;
}

export class AdminListResponse {
  admins: AdminResponse[];
  total: number;
  page: number;
  limit: number;
}
