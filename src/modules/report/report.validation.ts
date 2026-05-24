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
    granularity: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
      error: () => 'Granularitas tidak valid (harus daily, weekly, monthly, atau yearly)',
    }),
  });

  static readonly DATE_RANGE = z
    .object({
      from: z.coerce.date({
        error: (issue) =>
          issue.input === undefined ? 'Tanggal mulai wajib diisi' : 'Format tanggal mulai tidak valid',
      }),
      to: z.coerce.date({
        error: (issue) =>
          issue.input === undefined ? 'Tanggal selesai wajib diisi' : 'Format tanggal selesai tidak valid',
      }),
    })
    .refine((data) => data.from <= data.to, {
      message: 'Tanggal mulai tidak boleh setelah tanggal selesai',
      path: ['from'],
    })
    .refine(
      (data) => {
        const maxRangeMs = 366 * 24 * 60 * 60 * 1000; // 1 year
        return data.to.getTime() - data.from.getTime() <= maxRangeMs;
      },
      {
        message: 'Rentang tanggal tidak boleh melebihi 1 tahun',
        path: ['to'],
      },
    );
}
