import { readEnv } from '@/lib/env';

const REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_MODEL = 'glm-5-turbo';

interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ZaiCompletionPayload {
  error?: {
    code?: string;
    message?: string;
  };
  id?: string;
  model?: string;
  request_id?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class ZaiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ZaiClientError';
  }
}

export interface ZaiJsonCompletionResult {
  id: string | null;
  model: string | null;
  content: string;
  usage: ZaiCompletionPayload['usage'];
}

function buildChatCompletionUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, '');

  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

export async function generateZaiJsonCompletion(
  messages: ChatCompletionMessage[],
): Promise<ZaiJsonCompletionResult> {
  const env = readEnv();

  if (!env.ZAI_API_KEY) {
    throw new ZaiClientError('ZAI_API_KEY is required for AI extraction.', 500);
  }

  const response = await fetch(buildChatCompletionUrl(env.ZAI_BASE_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ZAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ZAI_MODEL ?? DEFAULT_MODEL,
      messages,
      temperature: 0.1,
      stream: false,
      response_format: {
        type: 'json_object',
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = (await response.json()) as ZaiCompletionPayload;

  if (!response.ok) {
    throw new ZaiClientError(
      payload.error?.message ?? 'Z.ai completion request failed.',
      response.status,
      {
        code: payload.error?.code,
        requestId: payload.request_id,
      },
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new ZaiClientError('Z.ai returned an empty completion.', 502, {
      requestId: payload.request_id,
    });
  }

  return {
    id: payload.id ?? null,
    model: payload.model ?? env.ZAI_MODEL ?? DEFAULT_MODEL,
    content,
    usage: payload.usage,
  };
}
