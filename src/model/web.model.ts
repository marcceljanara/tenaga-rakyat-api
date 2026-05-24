import { ApiPropertyOptional } from '@nestjs/swagger';

export class WebResponse<T> {
  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({
    oneOf: [
      { type: 'string', example: 'Error message here' },
      {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
        example: {
          field_name: ['pesan error 1', 'pesan error 2'],
        },
      },
    ],
    description: 'Detail error. Bisa berupa string pesan error tunggal atau objek terstruktur berisi pesan error validasi per field.',
  })
  errors?: string | Record<string, string[]>;

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
