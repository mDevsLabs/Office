import type { AiProviderId, AiProviderMeta, AiSettings, LegacyAiSettings } from './types'

export const MAI_API_BASE = 'https://mai.val.run'

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: 'mai' as AiProviderId,
    label: 'mAI Office',
    models: [], // Les modèles seront fetchés dynamiquement depuis /v1/models
    defaultModel: 'google/gemma-4-26b-a4b-it:free',
    keyPlaceholder: 'mAI API Key',
  },
]

export function defaultAiSettings(
  defaultApiKeys?: Partial<Record<AiProviderId, string>>,
): AiSettings {
  const providers = {} as AiSettings['providers']
  for (const meta of AI_PROVIDERS) {
    providers[meta.id] = {
      apiKey: defaultApiKeys?.[meta.id] ?? '',
      model: meta.defaultModel,
    }
  }
  return { provider: 'mai' as AiProviderId, providers }
}

export function resolveAiSettings(
  stored: Partial<AiSettings> & LegacyAiSettings,
  defaults: AiSettings,
): AiSettings {
  if (!stored.providers) {
    return defaults
  }
  return {
    provider: (stored.provider as AiProviderId) ?? defaults.provider,
    providers: { ...defaults.providers, ...stored.providers },
  }
}
