export class AddBalanceWalletInitRequest {
  user_id: string;
  balance: number;
}

export class TopupWalletRequest {
  balance: number;
}

export class AddTransactionInitRequest {
  amount: number;
  transaction_type: string;
  status: string;
}

export class MidtransSnapParams {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  item_details?: Array<{
    id?: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export class TopupCallbackRequest {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
}

export class WalletResponse {
  id: string;
  user_id: string;
  balance: number;
}
