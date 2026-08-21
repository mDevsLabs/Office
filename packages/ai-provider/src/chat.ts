import { httpBodyDetail } from './http-error'
import { MAI_API_BASE } from './providers'
import type { AiChatResponse, AiProviderConfig, AiProviderId } from './types'

const FALLBACK_FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'cohere/north-mini-code:free',
  'z-ai/glm-5.2:free',
  'poolside/laguna-xs-2.1:free',
  'poolside/laguna-s-2.1:free',
]

async function chatMaiCompatible(
  config: AiProviderConfig,
  system: string,
  user: string,
): Promise<AiChatResponse> {
  const primaryModel = config.model || 'google/gemma-4-26b-a4b-it:free'
  const modelsToTry = [primaryModel, ...FALLBACK_FREE_MODELS.filter((m) => m !== primaryModel)]

  let lastError = ''

  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(`${MAI_API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: user },
          ],
          temperature: 0.3,
        }),
      })

      if (!response.ok) {
        const rawBody = await response.text()
        lastError = `HTTP ${response.status}: ${httpBodyDetail(rawBody)}`
        // If 500, 502, 503, 504, 404, or "Failed to process", try next candidate model
        if (
          response.status >= 500 ||
          response.status === 404 ||
          rawBody.includes('Failed to process') ||
          rawBody.includes('not found')
        ) {
          continue
        }
        return { ok: false, error: lastError }
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      }
      const content = json.choices?.[0]?.message?.content
      if (!content) {
        continue
      }

      return { ok: true, content }
    } catch (err: any) {
      lastError = err instanceof Error ? err.message : String(err)
      continue
    }
  }

  return {
    ok: false,
    error: lastError || "Erreur : Impossible de traiter la requête IA. Veuillez vérifier votre connexion ou sélectionner un autre modèle.",
  }
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
