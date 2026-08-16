import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayModule } from './payment-gateway.module';
import { PAYMENT_GATEWAY } from './payment-gateway.port';
import { PaymentGatewayHttpAdapter } from './infrastructure/payment-gateway-http.adapter';

describe('PaymentGatewayModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PaymentGatewayModule],
    }).compile();
  });

  afterAll(async () => moduleRef.close());

  it('binds the gateway port to the HTTP adapter', () => {
    expect(moduleRef.get(PAYMENT_GATEWAY)).toBeInstanceOf(
      PaymentGatewayHttpAdapter,
    );
  });
});
