import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { runWithSchemaRetry } from '@/lib/extraction/schema-retry';

const recipeSchema = z.object({
  title: z.string().min(1),
  ingredients: z.array(z.string()).min(1),
});

describe('runWithSchemaRetry', () => {
  it('returns a validated result on the first successful attempt', async () => {
    const generate = vi.fn().mockResolvedValue({
      title: '김치찌개',
      ingredients: ['김치'],
    });

    await expect(
      runWithSchemaRetry({
        generate,
        validate: (payload) => recipeSchema.parse(payload),
      }),
    ).resolves.toEqual({
      result: {
        title: '김치찌개',
        ingredients: ['김치'],
      },
      attempts: 1,
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith({
      attempt: 1,
      previousIssues: [],
    });
  });

  it('retries once when schema validation fails and passes prior issues forward', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({
        title: '',
        ingredients: [],
      })
      .mockResolvedValueOnce({
        title: '계란말이',
        ingredients: ['계란'],
      });

    const result = await runWithSchemaRetry({
      generate,
      validate: (payload) => recipeSchema.parse(payload),
    });

    expect(result).toEqual({
      result: {
        title: '계란말이',
        ingredients: ['계란'],
      },
      attempts: 2,
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0]).toEqual({
      attempt: 2,
      previousIssues: [
        'title: Too small: expected string to have >=1 characters',
        'ingredients: Too small: expected array to have >=1 items',
      ],
    });
  });

  it('throws a retry exhaustion error after the final invalid attempt', async () => {
    const generate = vi.fn().mockResolvedValue({
      title: '',
      ingredients: [],
    });

    await expect(
      runWithSchemaRetry({
        generate,
        validate: (payload) => recipeSchema.parse(payload),
      }),
    ).rejects.toMatchObject({
      name: 'SchemaRetryExhaustedError',
      attempts: 2,
      issues: [
        'title: Too small: expected string to have >=1 characters',
        'ingredients: Too small: expected array to have >=1 items',
      ],
    });

    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-schema failures from the generator', async () => {
    const generate = vi.fn().mockRejectedValue(new Error('upstream failed'));

    await expect(
      runWithSchemaRetry({
        generate,
        validate: (payload) => recipeSchema.parse(payload),
      }),
    ).rejects.toThrow('upstream failed');

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid retry configuration', async () => {
    await expect(
      runWithSchemaRetry({
        generate: async () => ({ title: '된장찌개', ingredients: ['된장'] }),
        validate: (payload) => recipeSchema.parse(payload),
        maxAttempts: 0,
      }),
    ).rejects.toThrow('maxAttempts must be at least 1.');
  });
});
