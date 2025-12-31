import { ApiProperty } from '@nestjs/swagger';

export class AddUserPhotoRequest {
  @ApiProperty({ example: 'My portfolio work', description: 'Photo description' })
  description: string;
}

export class EditUserPhotoRequest {
  @ApiProperty({ example: 'Updated description', description: 'Updated photo description' })
  description: string;
}

export class UserPhotoResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  photo_url: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}