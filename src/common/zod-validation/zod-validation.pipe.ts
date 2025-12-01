import { PipeTransform, BadRequestException, Injectable } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any) {
    const parsed = this.schema.safeParse(value);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new BadRequestException(`Validation failed: ${message}`);
    }

    return parsed.data;
  }
}
