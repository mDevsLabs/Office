import { httpBodyDetail } from './http-error'
import { MAI_API_BASE } from './providers'
import type { AiChatResponse, AiProviderConfig, AiProviderId } from './types'

async function chatMaiCompatible(
  config: AiProviderConfig,
  system: string,
  user: string,
): Promise<AiChatResponse> {
  // Appel au modèle
  const modelName = config.model || 'poolside/laguna-xs-2.1:free'
  const response = await fetch(`${MAI_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
  })
  
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}: ${httpBodyDetail(await response.text())}` }
  }
  
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) return { ok: false, error: 'AI returned an empty response' }

  return { ok: true, content }
}

export async function chatForProvider(
  provider: AiProviderId,
  config: AiProviderConfig,
  system: string,
  user: string,
): Promise<AiChatResponse> {
  if (provider === 'mai') {
    return chatMaiCompatible(config, system, user)
  }
  return { ok: false, error: `Unknown provider: ${provider}` }
}

