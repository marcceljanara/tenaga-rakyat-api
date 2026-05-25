import { MidtransClientOptions } from 'midtrans-client';

export const midtransConfig: MidtransClientOptions = {
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
};
