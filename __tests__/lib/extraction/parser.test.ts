import { describe, expect, it } from 'vitest'

import { parseStructuredRecipePayload } from '@/lib/extraction/parser'
import { SchemaRetryableError } from '@/lib/extraction/schema-retry'

describe('parseStructuredRecipePayload', () => {
  it('parses fenced json blocks', () => {
    const parsed = parseStructuredRecipePayload('```json\n{"title":"Kimchi"}\n```')

    expect(parsed).toEqual({ title: 'Kimchi' })
  })

  it('parses json embedded in prose', () => {
    const parsed = parseStructuredRecipePayload(
      'Sure, here is the result:\n{"title":"Kimchi","steps":[]}',
    )

    expect(parsed).toEqual({ title: 'Kimchi', steps: [] })
  })

  it('throws a retryable error when no json is present', () => {
    expect(() => parseStructuredRecipePayload('not json at all')).toThrow(
      SchemaRetryableError,
    )
  })
})
