import { z } from 'zod';
import { TimeseriesGranularity } from '../../model/report.model';

export class ReportValidation {
  static readonly GRANULARITY_VALUES: TimeseriesGranularity[] = [
    'daily',
    'weekly',
    'monthly',
    'yearly',
  ];

  static readonly DASHBOARD_SUMMARY = z.object({
    granularity: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  });

  static readonly DATE_RANGE = z
    .object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    })
    .refine((data) => data.from <= data.to, {
      message: 'start date must not be after end date',
      path: ['from'],
    })
    .refine(
      (data) => {
        const maxRangeMs = 366 * 24 * 60 * 60 * 1000; // 1 year
        return data.to.getTime() - data.from.getTime() <= maxRangeMs;
      },
      {
        message: 'date range must not exceed 1 year',
        path: ['to'],
      },
    );
}
