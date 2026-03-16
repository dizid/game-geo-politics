import type { AIResponse } from '../../types/game'
import { validateResponse } from './responseValidator'

// ─── API call ─────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250514'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicRequest {
  model: string
  max_tokens: number
  messages: AnthropicMessage[]
}

interface AnthropicContentBlock {
  type: string
  text?: string
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
}

/**
 * Execute one narrative turn by calling the Anthropic API directly from the browser.
 * Returns a validated AIResponse. On any error, returns a safe fallback response.
 *
 * Uses raw fetch() — no @anthropic-ai/sdk dependency.
 */
export async function executeNarrativeTurn(
  apiKey: string,
  prompt: string,
  turn: number = 10,
): Promise<AIResponse> {
  const body: AnthropicRequest = {
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  }

  let rawText: string

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      return errorResponse(`API error ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as AnthropicResponse

    const firstBlock = data.content.find(block => block.type === 'text')
    if (!firstBlock || typeof firstBlock.text !== 'string') {
      return errorResponse('No text content in API response')
    }

    rawText = firstBlock.text
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return errorResponse(`Network error: ${message}`)
  }

  return validateResponse(rawText, turn)
}

// ─── Error fallback ───────────────────────────────────────────────────────────

function errorResponse(reason: string): AIResponse {
  return {
    headline:         'Communication disruption in global intelligence network.',
    narrative:        'Diplomatic channels experienced a temporary blackout. World leaders scramble for information.',
    world_reaction:   'Global markets pause as analysts await clarity.',
    stat_changes:     [],
    ai_reactions:     [],
    events_triggered: [],
    endgame_signal:   null,
    forecast:         `Systems coming back online. (${reason})`,
  }
}
