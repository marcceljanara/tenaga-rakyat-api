import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/client';

export class AddBalanceWalletInitRequest {
  @ApiProperty({ example: 'user-uuid-here', description: 'User ID' })
  user_id: string;

  @ApiProperty({ example: 100000, description: 'Balance amount to add' })
  balance: number;
}

export class TopupWalletRequest {
  @ApiProperty({
    example: 50000,
    description: 'Amount to top up',
    minimum: 10000,
  })
  balance: number;
}

export class AddTransactionInitRequest {
  @ApiProperty()
  amount: number;

  @ApiProperty()
  transaction_type: string;

  @ApiProperty()
  status: string;
}

export class MidtransSnapParams {
  @ApiProperty()
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };

  @ApiPropertyOptional()
  customer_details?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };

  @ApiPropertyOptional()
  item_details?: Array<{
    id?: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export class TopupCallbackRequest {
  @ApiProperty()
  order_id: string;

  @ApiProperty()
  status_code: string;

  @ApiProperty()
  gross_amount: string;

  @ApiProperty()
  signature_key: string;

  @ApiProperty()
  transaction_status: string;
}

export class WalletResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ type: 'string', example: '100000.00' })
  balance: Decimal;

  @ApiProperty()
  status: string;
}

export class TransactionResponse {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  source_wallet_id: number | null;

  @ApiPropertyOptional()
  destination_wallet_id: number | null;

  @ApiPropertyOptional()
  job_id: number | null;

  @ApiProperty()
  amount: Decimal;

  @ApiPropertyOptional()
  transaction_type: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class TransactionListResponse {
  @ApiProperty({ type: [TransactionResponse] })
  transactions: TransactionResponse[];
}

export class AddWithdrawMethodRequest {
  @ApiProperty({ enum: ['BANK_TRANSFER', 'EWALLET'], example: 'BANK_TRANSFER' })
  method: 'BANK_TRANSFER' | 'EWALLET';

  @ApiProperty({ example: 'BCA', description: 'Bank or e-wallet provider' })
  provider: string;

  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  account_name: string;

  @ApiProperty({ example: '1234567890', description: 'Account number' })
  account_number: string;
}

export class WithdrawMethodResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  method: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  account_name: string;

  @ApiProperty()
  account_number: string;

  @ApiProperty()
  is_active: boolean;
}

export class ListWithdrawMethodResponse {
  @ApiProperty({ type: [WithdrawMethodResponse] })
  withdraw_methods: WithdrawMethodResponse[];
}

export class CreateWithdrawRequestRequest {
  @ApiProperty({
    example: 50000,
    description: 'Amount to withdraw',
    minimum: 10000,
  })
  amount: number;

  @ApiProperty({ example: 1, description: 'Withdraw method ID' })
  method_id: number;
}

export class WithdrawRequestResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  amount: Decimal;

  @ApiProperty()
  fee_charged: Decimal;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: WithdrawMethodResponse })
  method: WithdrawMethodResponse;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  admin_note?: string | null;

  @ApiPropertyOptional()
  transfer_receipt?: string | null;

  @ApiPropertyOptional()
  admin_locked_by?: string | null;

  @ApiPropertyOptional()
  admin_approved_by?: string | null;

  @ApiPropertyOptional()
  admin_rejected_by?: string | null;
}

export class WithdrawMethodReadyToPay {
  @ApiProperty()
  method: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  account_name: string;

  @ApiProperty()
  account_number: string;
}

export class WithdrawRequestDetailResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  amount: Decimal;

  @ApiProperty()
  status: string;

  @ApiProperty()
  method: string;

  @ApiProperty()
  provider: string;

  @ApiProperty()
  account_name: string;

  @ApiProperty()
  account_number: string;

  @ApiProperty()
  created_at: Date;

  @ApiPropertyOptional()
  admin_locked_by?: string | null;

  @ApiPropertyOptional()
  admin_note?: string | null;
}

export class ListWithdrawRequestResponse {
  @ApiProperty({ type: [WithdrawRequestDetailResponse] })
  requests: WithdrawRequestDetailResponse[];
}

export class LockWithdrawRequest {
  @ApiPropertyOptional({
    example: 'Processing this request',
    description: 'Admin note',
  })
  admin_note?: string;
}

export class ApproveWithdrawRequest {
  @ApiPropertyOptional({
    example: 'Approved for payment',
    description: 'Admin note',
  })
  admin_note?: string;
}

export class RejectWithdrawRequest {
  @ApiProperty({
    example: 'Insufficient verification documents',
    description: 'Reason for rejection',
  })
  admin_note: string;
}

export class SendWithdrawRequest {
  @ApiProperty({
    example: 'https://cdn.example.com/receipt.jpg',
    description: 'Transfer receipt URL',
  })
  transfer_receipt: string;
}

export class WithdrawRequestQueryParams {
  @ApiPropertyOptional({
    enum: ['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'SENT'],
  })
  status?: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'SENT';

  @ApiPropertyOptional()
  user_id?: string;
}

export class WithdrawPreviewRequest {
  @ApiProperty({ example: 50000 })
  amount: number;

  @ApiProperty({ example: 1 })
  method_id: number;
}

export class WithdrawPreviewResponse {
  @ApiProperty()
  amount_requested: Decimal;

  @ApiProperty()
  fee_charged: Decimal;

  @ApiProperty()
  net_amount: Decimal;

  @ApiProperty()
  can_withdraw: boolean;

  @ApiProperty()
  reason: string;
}

export class TopupCreditRequest {
  @ApiProperty({ example: 1, description: 'Package ID to purchase' })
  package_id: number;
}

export class CreditBalanceResponse {
  @ApiProperty({ example: 5, description: 'Free quota balance' })
  free_quota: number;

  @ApiProperty({ example: 10, description: 'Paid credit balance' })
  paid_credit: number;
}

export class PostingPackageResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Basic Package' })
  name: string;

  @ApiProperty({ example: 10 })
  credit_amount: number;

  @ApiProperty({ type: 'string', example: '50000.00' })
  price: Decimal;

  @ApiPropertyOptional({ example: true })
  is_active?: boolean;

  @ApiPropertyOptional()
  created_at?: Date;

  @ApiPropertyOptional()
  updated_at?: Date;
}

export class ListPostingPackageResponse {
  @ApiProperty({ type: [PostingPackageResponse] })
  packages: PostingPackageResponse[];
}

export class AddPostinCreditPackageRequest {
  @ApiProperty({ example: 'Basic Package', description: 'Package name' })
  name: string;

  @ApiProperty({ example: 10, description: 'Credit amount' })
  credit_amount: number;

  @ApiProperty({ example: 50000, description: 'Price in IDR' })
  price: number;
}

export class EditPostingCreditPackageRequest {
  @ApiProperty({ example: 'Basic Package Update', description: 'Package name' })
  name: string;

  @ApiProperty({ example: 15, description: 'Credit amount' })
  credit_amount: number;

  @ApiProperty({ example: 60000, description: 'Price in IDR' })
  price: number;

  @ApiProperty({ example: true, description: 'Is package active' })
  is_active: boolean;
}

export class PostingCreditPurchaseResponse {
  @ApiPropertyOptional({ description: 'Payment date' })
  paid_at: Date | null;

  @ApiProperty({ example: 'order-id-123', description: 'Midtrans Order ID' })
  payment_reference: string;

  @ApiProperty({ example: 'COMPLETED', description: 'Transaction status' })
  status: string;

  @ApiProperty({ example: 10, description: 'Credit amount purchased' })
  credit_amount: number;

  @ApiProperty({ type: 'string', example: '50000.00' })
  total_price: Decimal;
}
