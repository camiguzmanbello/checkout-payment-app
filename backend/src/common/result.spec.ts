import { ok, fail } from './result';

describe('Result (ROP combinators)', () => {
  it('map transforms the value only on the success track', () => {
    const result = ok<number, string>(2).map((x) => x * 10);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toBe(20);
  });

  it('map leaves the failure track untouched', () => {
    const result = fail<string, number>('BAD_INPUT').map((x: number) => x * 10);
    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('BAD_INPUT');
  });

  it('andThen chains steps and stops at the first failure', async () => {
    const step1 = ok<number, string>(5);
    const result = await step1.andThen(async (x) =>
      x > 0 ? ok(x + 1) : fail('NEGATIVE'),
    );
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toBe(6);
  });

  it('andThen skips the next step when it already failed', async () => {
    const fn = jest.fn();
    const step1 = fail<string, number>('FIRST_ERROR');
    const result = await step1.andThen(fn);

    expect(fn).not.toHaveBeenCalled();
    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('FIRST_ERROR');
  });

  it('fold applies the handler matching each track', () => {
    const successValue = ok<number, string>(1).fold(
      (v) => `success:${v}`,
      (e) => `error:${e}`,
    );
    const failureValue = fail<string, number>('X').fold(
      (v) => `success:${v}`,
      (e) => `error:${e}`,
    );

    expect(successValue).toBe('success:1');
    expect(failureValue).toBe('error:X');
  });
});
