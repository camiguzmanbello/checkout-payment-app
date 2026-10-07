import { Test, TestingModule } from '@nestjs/testing';
import { HealthModule } from './health.module';
import { HealthController } from './infrastructure/health.controller';

describe('HealthModule', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
  });

  afterAll(async () => moduleRef.close());

  it('resolves the controller', () => {
    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
  });
});
