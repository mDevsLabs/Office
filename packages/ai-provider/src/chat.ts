import { httpBodyDetail } from './http-error'
import { MAI_API_BASE } from './providers'
import type { AiChatResponse, AiProviderConfig, AiProviderId } from './types'

async function logUsage(config: AiProviderConfig, tokensUsed = 0): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${MAI_API_BASE}/usage-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ tokensUsed }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || 'Quota dépassé ou non autorisé' }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

async function chatMaiCompatible(
  config: AiProviderConfig,
  system: string,
  user: string,
): Promise<AiChatResponse> {
  // 1. Calcul estimé des tokens d'entrée
  const promptTokens = Math.max(1, Math.round((system.length + user.length) / 4))

  // 2. Vérification préliminaire du quota
  const usageCheck = await logUsage(config, 0)
  if (!usageCheck.ok) {
    return { ok: false, error: `Quota dépassé : ${usageCheck.error}` }
  }

  // 3. Appel au modèle
  const response = await fetch(`${MAI_API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
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

  // 4. Calcul de la consommation totale (Input tokens + Output tokens)
  const totalTokens =
    json.usage?.total_tokens ??
    ((json.usage?.prompt_tokens ?? promptTokens) +
      (json.usage?.completion_tokens ?? Math.max(1, Math.round(content.length / 4))))

  // 5. Enregistrement / déduction des tokens consommés
  void logUsage(config, totalTokens)

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

