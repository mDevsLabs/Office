import { httpBodyDetail } from './http-error'
import { MAI_API_BASE } from './providers'
import type { AiChatResponse, AiProviderConfig, AiProviderId } from './types'

async function logUsage(config: AiProviderConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${MAI_API_BASE}/log-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      }
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || 'Quota dépassé ou erreur de vérification' }
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
  const usageCheck = await logUsage(config)
  if (!usageCheck.ok) {
    return { ok: false, error: `Quota check failed: ${usageCheck.error}` }
  }

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
  
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
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
