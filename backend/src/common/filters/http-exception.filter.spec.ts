import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as any;

  beforeAll(() => {
    // The filter logs the full detail on purpose; keep the test output clean.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => jest.clearAllMocks());

  it('keeps the status and message of an HTTP exception', () => {
    filter.catch(new BadRequestException('INSUFFICIENT_STOCK'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'INSUFFICIENT_STOCK',
      }),
    );
  });

  it('unwraps the message of a validation error response', () => {
    filter.catch(new BadRequestException({ message: ['cvc must be numeric'] }), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['cvc must be numeric'] }),
    );
  });

  it('falls back to the whole payload when it carries no message field', () => {
    filter.catch(new BadRequestException({ error: 'Bad Request' }), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: { error: 'Bad Request' } }),
    );
  });

  it('hides the detail of an unexpected error behind a 500', () => {
    filter.catch(new Error('connection string leaked here'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('leaked');
  });

  it('stamps every response with a timestamp', () => {
    filter.catch(new Error('boom'), host);

    expect(json.mock.calls[0][0].timestamp).toEqual(expect.any(String));
  });
});
