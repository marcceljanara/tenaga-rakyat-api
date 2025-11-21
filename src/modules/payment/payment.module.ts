import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransService } from './midtrans/midtrans.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, MidtransService],
})
export class PaymentModule {}
