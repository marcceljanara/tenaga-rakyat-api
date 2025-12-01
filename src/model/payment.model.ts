import { Decimal } from '@prisma/client/runtime/client';

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
  id: bigint;
  user_id: string;
  balance: Decimal;
  status: string;
}

export class TransactionListResponse {
  transactions: TransactionResponse[];
}

export class TransactionResponse {
  id: bigint;
  source_wallet_id: bigint | null;
  destination_wallet_id: bigint | null;
  job_id: bigint | null;
  amount: Decimal;
  transaction_type: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class AddWithdrawMethodRequest {
  method: 'BANK_TRANSFER' | 'EWALLET';
  provider: string;
  account_name: string;
  account_number: string;
}

export class WithdrawMethodResponse {
  id: bigint;
  method: string;
  provider: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
}

export class ListWithdrawMethodResponse {
  withdraw_methods: WithdrawMethodResponse[];
}

export class CreateWithdrawRequestRequest {
  amount: number;
  method_id: number;
}

export class WithdrawRequestResponse {
  id: bigint;
  amount: Decimal;
  fee_charged: Decimal;
  status: string;
  method: WithdrawMethodResponse;
  created_at: Date;
  admin_note?: string | null;
  transfer_receipt?: string | null;
  admin_locked_by?: string | null;
  admin_approved_by?: string | null;
  admin_rejected_by?: string | null;
}

export class WithdrawMethodReadyToPay {
  method: string;
  provider: string;
  account_name: string;
  account_number: string;
}

export class ListWithdrawRequestResponse {
  requests: WithdrawRequestDetailResponse[];
}

export class WithdrawRequestDetailResponse {
  id: bigint;
  user_id: string;
  amount: Decimal;
  status: string;
  method: string;
  provider: string;
  account_name: string;
  account_number: string;
  created_at: Date;
  admin_locked_by?: string | null;
  admin_note?: string | null;
}

export class LockWithdrawRequest {
  admin_note?: string;
}

export class ApproveWithdrawRequest {
  admin_note?: string;
}

export class RejectWithdrawRequest {
  admin_note: string;
}

export class SendWithdrawRequest {
  transfer_receipt: string;
}

export class WithdrawRequestQueryParams {
  status?: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'SENT';
  user_id?: string;
}

export class WithdrawPreviewRequest {
  amount: number;
  method_id: number;
}

export class WithdrawPreviewResponse {
  amount_requested: Decimal;
  fee_charged: Decimal;
  net_amount: Decimal;
  can_withdraw: boolean;
  reason: string;
}
