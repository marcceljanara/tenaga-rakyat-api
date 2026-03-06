import { ApiPropertyOptional } from '@nestjs/swagger';

export class WebResponse<T> {
  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  errors?: string;

  @ApiPropertyOptional()
  paging?: Paging;

  @ApiPropertyOptional()
  message?: string;
}

export class Paging {
  @ApiPropertyOptional()
  size: number;

  @ApiPropertyOptional()
  total_page: number;

  @ApiPropertyOptional()
  current_page: number;

  @ApiPropertyOptional()
  total_data: number;
}
