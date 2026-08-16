import { ok, fail } from './result';

describe('Result (ROP combinators)', () => {
  it('map transforma el valor solo en el riel de éxito', () => {
    const result = ok<number, string>(2).map((x) => x * 10);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toBe(20);
  });

  it('map no toca el riel de fallo', () => {
    const result = fail<string, number>('BAD_INPUT').map((x: number) => x * 10);
    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('BAD_INPUT');
  });

  it('andThen encadena pasos y se detiene en el primer fallo', async () => {
    const step1 = ok<number, string>(5);
    const result = await step1.andThen(async (x) =>
      x > 0 ? ok(x + 1) : fail('NEGATIVE'),
    );
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.value).toBe(6);
  });

  it('andThen no ejecuta el siguiente paso si ya venía en fallo', async () => {
    const fn = jest.fn();
    const step1 = fail<string, number>('FIRST_ERROR');
    const result = await step1.andThen(fn);

    expect(fn).not.toHaveBeenCalled();
    expect(result.isFailure).toBe(true);
    if (result.isFailure) expect(result.error).toBe('FIRST_ERROR');
  });

  it('fold aplica el handler correspondiente a cada riel', () => {
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
