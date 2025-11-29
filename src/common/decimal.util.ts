import { Decimal } from '@prisma/client/runtime/client';

export const dec = (v: Decimal.Value) => new Decimal(v);
