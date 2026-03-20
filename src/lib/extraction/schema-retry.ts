import { ZodError } from 'zod';

export class SchemaRetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly issues: string[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SchemaRetryExhaustedError';
  }
}

export interface RunWithSchemaRetryOptions<T> {
  generate: (context: {
    attempt: number;
    previousIssues: string[];
  }) => Promise<unknown>;
  validate: (payload: unknown) => T;
  maxAttempts?: number;
}

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export async function runWithSchemaRetry<T>({
  generate,
  validate,
  maxAttempts = 2,
}: RunWithSchemaRetryOptions<T>) {
  if (maxAttempts < 1) {
    throw new RangeError('maxAttempts must be at least 1.');
  }

  let previousIssues: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payload = await generate({
        attempt,
        previousIssues,
      });

      return {
        result: validate(payload),
        attempts: attempt,
      };
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      previousIssues = formatZodIssues(error);

      if (attempt === maxAttempts) {
        throw new SchemaRetryExhaustedError(
          'Structured extraction did not satisfy the schema before retries were exhausted.',
          attempt,
          previousIssues,
          { cause: error },
        );
      }
    }
  }

  throw new SchemaRetryExhaustedError(
    'Structured extraction did not run.',
    0,
    [],
  );
}
