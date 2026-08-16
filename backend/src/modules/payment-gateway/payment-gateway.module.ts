import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment-gateway.port';
import { PaymentGatewayHttpAdapter } from './infrastructure/payment-gateway-http.adapter';

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: PaymentGatewayHttpAdapter }],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentGatewayModule {}
