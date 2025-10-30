export class AddUserPhotoRequest {
  description: string;
}

export class EditUserPhotoRequest {
  description: string;
}

export class UserPhotoResponse {
  id: string;
  user_id: string;
  photo_url: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}
