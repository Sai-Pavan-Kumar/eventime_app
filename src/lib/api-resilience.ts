/**
 * Network and Query Resilience Helper for Supabase & Mobile HTTP calls.
 * Protects mobile clients on spotty connections from hanging indefinitely.
 */

export interface RetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  delayMs?: number;
}

/**
 * Wraps an async Promise with a timeout to prevent hanging UI spinners on packet loss.
 */
export async function withTimeout<T>(
  promise: PromiseLike<T> | Promise<T>,
  timeoutMs: number = 8000,
  errorMessage: string = 'Network request timed out. Please check your connection.'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Exponential backoff retry utility for non-mutating network reads.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 2, timeoutMs = 7000, delayMs = 600 } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential delay with jitter
        const backoff = delayMs * Math.pow(1.5, attempt) + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError;
}
