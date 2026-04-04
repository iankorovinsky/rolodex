declare module 'bun:test' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const test: typeof it;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;

  export interface Mock<TArgs extends unknown[] = unknown[], TReturn = unknown> {
    (...args: TArgs): TReturn;
    mockReset(): void;
    mockResolvedValue(value: Awaited<TReturn>): this;
    mockResolvedValueOnce(value: Awaited<TReturn>): this;
  }

  export const mock: {
    <TArgs extends unknown[] = unknown[], TReturn = unknown>(
      implementation?: (...args: TArgs) => TReturn
    ): Mock<TArgs, TReturn>;
    module(path: string, factory: () => unknown): void;
  };

  export const expect: {
    (value: unknown): {
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
      toHaveBeenCalledTimes(expected: number): void;
      toHaveBeenCalledWith(...expected: unknown[]): void;
      toThrow(expected?: string | RegExp): Promise<void> | void;
      not: {
        toHaveBeenCalled(): void;
      };
      rejects: {
        toThrow(expected?: string | RegExp): Promise<void>;
      };
    };
    any(expected: unknown): unknown;
    objectContaining(expected: Record<string, unknown>): unknown;
    stringMatching(expected: RegExp): unknown;
  };
}
