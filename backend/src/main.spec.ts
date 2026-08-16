jest.mock('@nestjs/core', () => ({
  ...jest.requireActual('@nestjs/core'),
  NestFactory: { create: jest.fn() },
}));

jest.mock('@nestjs/swagger', () => ({
  ...jest.requireActual('@nestjs/swagger'),
  SwaggerModule: { createDocument: jest.fn(() => ({})), setup: jest.fn() },
}));

const buildApp = () => ({
  use: jest.fn(),
  enableCors: jest.fn(),
  useGlobalPipes: jest.fn(),
  useGlobalFilters: jest.fn(),
  listen: jest.fn().mockResolvedValue(undefined),
});

// Reloading main.ts pulls the whole Nest graph in again, which is slow while
// the other suites are running in parallel.
jest.setTimeout(30000);

const waitFor = async (done: () => boolean, timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (done()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('bootstrap did not finish within the timeout');
};

// main.ts bootstraps on import, so every case reloads it with its own env.
// The module registry is reset each time, which means the mocks have to be
// picked up from the fresh registry rather than from the top-level import.
const bootstrapWith = async (env: Record<string, string | undefined>) => {
  jest.resetModules();

  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });

  const { NestFactory } = require('@nestjs/core');
  const { SwaggerModule } = require('@nestjs/swagger');
  const app = buildApp();
  NestFactory.create.mockResolvedValue(app);

  require('./main');
  // bootstrap() is async and nothing exports it, so wait for its last step
  // instead of guessing a delay — a fixed sleep is flaky under load.
  await waitFor(() => app.listen.mock.calls.length > 0);

  return { app, NestFactory, SwaggerModule };
};

describe('bootstrap', () => {
  const originalEnv = { ...process.env };

  afterAll(() => {
    process.env = originalEnv;
  });

  it('applies the security middleware and the strict validation pipe', async () => {
    const { app, NestFactory } = await bootstrapWith({
      PORT: '4001',
      FRONTEND_ORIGIN: 'http://a.test,http://b.test',
    });

    expect(NestFactory.create).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledTimes(1); // helmet
    expect(app.useGlobalPipes.mock.calls[0][0].constructor.name).toBe(
      'ValidationPipe',
    );
    expect(app.useGlobalFilters.mock.calls[0][0].constructor.name).toBe(
      'GlobalExceptionFilter',
    );
  });

  it('restricts CORS to the configured origins and listens on PORT', async () => {
    const { app } = await bootstrapWith({
      PORT: '4001',
      FRONTEND_ORIGIN: 'http://a.test,http://b.test',
    });

    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://a.test', 'http://b.test'],
      credentials: true,
    });
    expect(app.listen).toHaveBeenCalledWith('4001');
  });

  // The default branch of FRONTEND_ORIGIN cannot be reached here: importing
  // main.ts pulls in @prisma/client, which loads .env and repopulates the
  // variable. A single configured origin is the case worth pinning down.
  it('accepts a single configured origin', async () => {
    const { app } = await bootstrapWith({
      PORT: '4001',
      FRONTEND_ORIGIN: 'http://only.test',
    });

    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://only.test'],
      credentials: true,
    });
  });

  it('exposes the Swagger UI on /api-docs', async () => {
    const { SwaggerModule } = await bootstrapWith({ PORT: '4001' });

    expect(SwaggerModule.createDocument).toHaveBeenCalled();
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'api-docs',
      expect.anything(),
      expect.anything(),
    );
  });
});
