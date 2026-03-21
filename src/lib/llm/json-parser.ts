function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flattenContentParts(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }

      if (!isRecord(part)) {
        return ''
      }

      if (typeof part.text === 'string') {
        return part.text
      }

      if (typeof part.content === 'string') {
        return part.content
      }

      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function findBalancedJsonSegment(value: string) {
  const startIndex = value.search(/[\[{]/)

  if (startIndex === -1) {
    return null
  }

  const stack: string[] = []
  let inString = false
  let escaping = false

  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index]

    if (inString) {
      if (escaping) {
        escaping = false
        continue
      }

      if (character === '\\') {
        escaping = true
        continue
      }

      if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      continue
    }

    if (character === '{' || character === '[') {
      stack.push(character)
      continue
    }

    if (character === '}' || character === ']') {
      const opener = stack.at(-1)

      if (
        (character === '}' && opener !== '{') ||
        (character === ']' && opener !== '[')
      ) {
        return null
      }

      stack.pop()

      if (stack.length === 0) {
        return value.slice(startIndex, index + 1)
      }
    }
  }

  return null
}

export class JsonParserError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'JsonParserError'
  }
}

export function extractTextFromLlmPayload(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload.trim()
  }

  if (!isRecord(payload)) {
    throw new JsonParserError('LLM payload did not contain readable text.', String(payload))
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text.trim()
  }

  if (typeof payload.content === 'string') {
    return payload.content.trim()
  }

  const flatContent = flattenContentParts(payload.content)

  if (flatContent) {
    return flatContent.trim()
  }

  if (Array.isArray(payload.choices)) {
    for (const choice of payload.choices) {
      if (!isRecord(choice)) {
        continue
      }

      const message = isRecord(choice.message) ? choice.message : null

      if (message) {
        if (typeof message.content === 'string' && message.content.trim()) {
          return message.content.trim()
        }

        const flatMessageContent = flattenContentParts(message.content)

        if (flatMessageContent) {
          return flatMessageContent.trim()
        }
      }

      if (typeof choice.text === 'string' && choice.text.trim()) {
        return choice.text.trim()
      }
    }
  }

  throw new JsonParserError(
    'LLM payload did not contain readable text.',
    JSON.stringify(payload),
  )
}

export function extractJsonText(rawText: string) {
  const trimmed = rawText.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const balanced = findBalancedJsonSegment(trimmed)

  if (balanced) {
    return balanced.trim()
  }

  throw new JsonParserError('Model output did not contain a JSON object or array.', rawText)
}

export function parseJsonText<T>(rawText: string): T {
  const jsonText = extractJsonText(rawText)

  try {
    return JSON.parse(jsonText) as T
  } catch (error) {
    throw new JsonParserError('Model output contained invalid JSON.', rawText, {
      cause: error,
    })
  }
}

export function parseLlmJsonPayload<T>(payload: unknown) {
  const text = extractTextFromLlmPayload(payload)

  return {
    text,
    data: parseJsonText<T>(text),
  }
}
