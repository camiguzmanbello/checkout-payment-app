// Railway Oriented Programming (ROP):
// Each step returns a Result instead of throwing. Steps compose with `map`
// and `andThen` so the flow either stays on the "success rail" or short-circuits
// to the "failure rail" — without manual if/else branching at each step.

export type Result<T, E = string> = Success<T, E> | Failure<T, E>;

abstract class ResultBase<T, E> {
  abstract readonly isSuccess: boolean;
  abstract readonly isFailure: boolean;

  // Transforms the success value, leaves failure untouched.
  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  // Chains another Result-returning step. Short-circuits on failure.
  abstract andThen<U>(fn: (value: T) => Result<U, E> | Promise<Result<U, E>>): Promise<Result<U, E>>;

  // Unwraps to a plain value, applying a handler for each rail.
  abstract fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): U;
}

export class Success<T, E = never> extends ResultBase<T, E> {
  readonly isSuccess = true as const;
  readonly isFailure = false as const;
  constructor(public readonly value: T) {
    super();
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Success<U, E>(fn(this.value));
  }

  async andThen<U>(fn: (value: T) => Result<U, E> | Promise<Result<U, E>>): Promise<Result<U, E>> {
    return fn(this.value);
  }

  fold<U>(onSuccess: (value: T) => U): U {
    return onSuccess(this.value);
  }
}

export class Failure<T = never, E = string> extends ResultBase<T, E> {
  readonly isSuccess = false as const;
  readonly isFailure = true as const;
  constructor(public readonly error: E) {
    super();
  }

  map<U>(): Result<U, E> {
    return new Failure<U, E>(this.error);
  }

  async andThen<U>(): Promise<Result<U, E>> {
    return new Failure<U, E>(this.error);
  }

  fold<U>(_onSuccess: (value: T) => U, onFailure: (error: E) => U): U {
    return onFailure(this.error);
  }
}

export const ok = <T, E = never>(value: T): Result<T, E> => new Success<T, E>(value);
export const fail = <E, T = never>(error: E): Result<T, E> => new Failure<T, E>(error);
