import { readEnv } from '@/lib/env'
import { extractTextFromLlmPayload } from '@/lib/llm/json-parser'

const DEFAULT_ZAI_MODEL = 'glm-4.5-air'
const DEFAULT_TIMEOUT_MS = 25_000
const DEFAULT_MAX_ATTEMPTS = 2
const RETRY_BASE_DELAY_MS = 300
const JSON_OBJECT_RESPONSE_FORMAT = {
  type: 'json_object',
} as const

export type LlmErrorCode =
  | 'LLM_REQUEST_FAILED'
  | 'LLM_RATE_LIMITED'
  | 'INVALID_MODEL_OUTPUT'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateTextOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
  maxAttempts?: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

export interface LlmGenerationResult {
  attempt: number
  model: string | null
  content: string
  latencyMs: number
  rawResponse: Record<string, unknown> | null
}

export class LlmClientError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly details?: Record<string, unknown>,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'LlmClientError'
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function jitteredBackoff(attempt: number) {
  return RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 75)
}

function createRequestSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const abortFromParent = () => controller.abort(parentSignal?.reason)

  if (parentSignal?.aborted) {
    abortFromParent()
  } else if (parentSignal) {
    parentSignal.addEventListener('abort', abortFromParent, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      parentSignal?.removeEventListener('abort', abortFromParent)
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function getErrorMessage(payload: unknown, fallback: string) {
  const record = asRecord(payload)
  const error = record ? asRecord(record.error) : null

  return typeof error?.message === 'string'
    ? error.message
    : typeof record?.message === 'string'
      ? record.message
      : fallback
}

function summarizeRawResponse(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload)

  if (!record) {
    return null
  }

  const contentPreview = (() => {
    try {
      return extractTextFromLlmPayload(payload).slice(0, 400)
    } catch {
      return null
    }
  })()

  return {
    model: typeof record.model === 'string' ? record.model : null,
    id: typeof record.id === 'string' ? record.id : null,
    contentPreview,
  }
}

function createHttpError(status: number, payload: unknown) {
  if (status === 429) {
    return new LlmClientError(
      'LLM_RATE_LIMITED',
      getErrorMessage(payload, 'The language model rate limit was exceeded.'),
      429,
      true,
      {
        status,
      },
    )
  }

  return new LlmClientError(
    'LLM_REQUEST_FAILED',
    getErrorMessage(payload, 'The language model request failed.'),
    status >= 400 && status < 500 ? status : 502,
    status >= 500,
    {
      status,
    },
  )
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '')
}

export async function generateText(
  messages: LlmMessage[],
  options: GenerateTextOptions = {},
): Promise<LlmGenerationResult> {
  const env = readEnv()
  const apiKey = options.apiKey ?? env.ZAI_API_KEY
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? env.ZAI_BASE_URL)
  const model = options.model ?? env.ZAI_MODEL ?? DEFAULT_ZAI_MODEL
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const fetchImpl = options.fetchImpl ?? fetch

  if (!apiKey) {
    throw new LlmClientError(
      'LLM_REQUEST_FAILED',
      'ZAI_API_KEY is not configured.',
      500,
      false,
    )
  }

  let latestError: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now()
    const { signal, cleanup } = createRequestSignal(options.signal, timeoutMs)

    try {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages,
          response_format: JSON_OBJECT_RESPONSE_FORMAT,
        }),
        signal,
      })

      const rawPayload = await response
        .json()
        .catch(async () => ({ message: await response.text() }))

      if (!response.ok) {
        throw createHttpError(response.status, rawPayload)
      }

      const content = extractTextFromLlmPayload(rawPayload)

      if (!content) {
        throw new LlmClientError(
          'INVALID_MODEL_OUTPUT',
          'The language model returned an empty response.',
          502,
          true,
          summarizeRawResponse(rawPayload) ?? undefined,
        )
      }

      return {
        attempt,
        model:
          (asRecord(rawPayload) && typeof asRecord(rawPayload)?.model === 'string'
            ? (asRecord(rawPayload)?.model as string)
            : model) ?? null,
        content,
        latencyMs: Date.now() - startedAt,
        rawResponse: summarizeRawResponse(rawPayload),
      }
    } catch (error) {
      latestError = error
      const retryable =
        (error instanceof LlmClientError && error.retryable) ||
        (error instanceof Error && error.name === 'AbortError') ||
        error instanceof TypeError

      if (attempt < maxAttempts && retryable) {
        await sleep(jitteredBackoff(attempt))
        continue
      }

      if (error instanceof LlmClientError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LlmClientError(
          'LLM_REQUEST_FAILED',
          'The language model request timed out.',
          504,
          false,
          undefined,
          { cause: error },
        )
      }

      throw new LlmClientError(
        'LLM_REQUEST_FAILED',
        'The language model request failed.',
        502,
        false,
        undefined,
        { cause: error instanceof Error ? error : undefined },
      )
    } finally {
      cleanup()
    }
  }

  throw new LlmClientError(
    'LLM_REQUEST_FAILED',
    'The language model request failed.',
    502,
    false,
    latestError instanceof Error
      ? {
          cause: latestError.message,
        }
      : undefined,
  )
}
