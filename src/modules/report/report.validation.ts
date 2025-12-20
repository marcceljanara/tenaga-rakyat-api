import z from 'zod';

export class ReportValidation {
  static readonly DATE_RANGE = z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  });
}
