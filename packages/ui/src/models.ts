export interface AIModelInfo {
  id: string
  name: string
  provider?: string
}

export const KNOWN_MODEL_NAMES: Record<string, string> = {
  'dots-studio/dots-3-note-preview:free': 'Dots 3 Note Preview (free)',
  'liquid/lfm-2.5-2.6b:free': 'Liquid LFM 2.5 2.6B (free)',
  'nvidia/nemotron-3.5-lightning:free': 'Nvidia Nemotron 3.5 Lightning (free)',
  'poolside/laguna-s-2.1:free': 'Poolside Laguna S 2.1 (free)',
  'poolside/laguna-xs-2.1:free': 'Poolside Laguna XS 2.1 (free)',
  'cohere/north-mini-code:free': 'Cohere North Mini Code (free)',
  'z-ai/glm-5.2:free': 'Z-AI GLM 5.2 (free)',
  'nvidia/nemotron-3.5-content-safety:free': 'Nvidia Nemotron 3.5 Content Safety (free)',
  'nvidia/nemotron-3-ultra-550b-a55b:free': 'Nvidia Nemotron 3 Ultra 550B (free)',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Nvidia Nemotron 3 Nano Omni 30B (free)',
  'google/gemma-4-26b-a4b-it:free': 'Google Gemma 4 26B (free)',
  'google/gemma-4-31b-it:free': 'Google Gemma 4 31B (free)',
  'nvidia/nemotron-3-super-120b-a12b:free': 'Nvidia Nemotron 3 Super 120B (free)',
  'nvidia/nemotron-3-nano-30b-a3b:free': 'Nvidia Nemotron 3 Nano 30B (free)',
  'nvidia/nemotron-nano-12b-v2-vl:free': 'Nvidia Nemotron Nano 12B VL (free)',
  'nvidia/nemotron-nano-9b-v2:free': 'Nvidia Nemotron Nano 9B v2 (free)',
  'openai/gpt-oss-20b:free': 'OpenAI GPT OSS 20B (free)',
  'google/gemini-2.5-flash:free': 'Google Gemini 2.5 Flash (free)',
  'meta-llama/llama-3.3-70b-instruct:free': 'Meta Llama 3.3 70B Instruct (free)',
  'qwen/qwen-2.5-coder-32b-instruct:free': 'Qwen 2.5 Coder 32B (free)',
  'deepseek/deepseek-r1:free': 'DeepSeek R1 (free)',
  'mai-1.5-light': 'mAI-1.5-Light',
  'mai-1.5-apex': 'mAI-1.5-Apex',
  'mai-1.5-opal': 'mAI-1.5-Opal',
  'mai-1.2-light': 'mAI-1.2-Light',
  'mai-1.2-apex': 'mAI-1.2-Apex',
  'mai-1.2-opal': 'mAI-1.2-Opal',
  'mai-1': 'mAI-1',
  'mai-1-light': 'mAI-1-Light',
}

export const DEFAULT_AI_MODELS: AIModelInfo[] = [
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google Gemma 4 26B (free)' },
  { id: 'openai/gpt-oss-20b:free', name: 'OpenAI GPT OSS 20B (free)' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nvidia Nemotron 3.5 Lightning (free)' },
  { id: 'cohere/north-mini-code:free', name: 'Cohere North Mini Code (free)' },
  { id: 'z-ai/glm-5.2:free', name: 'Z-AI GLM 5.2 (free)' },
  { id: 'poolside/laguna-xs-2.1:free', name: 'Poolside Laguna XS 2.1 (free)' },
  { id: 'poolside/laguna-s-2.1:free', name: 'Poolside Laguna S 2.1 (free)' },
]

export function formatModelDisplayName(id: string, rawName?: string): string {
  if (!id) return ''
  if (KNOWN_MODEL_NAMES[id]) {
    return KNOWN_MODEL_NAMES[id]
  }
  if (rawName && rawName !== id && !rawName.includes('/')) {
    return rawName
  }

  const isFree = id.endsWith(':free')
  const cleanId = id.replace(/:free$/, '')
  const parts = cleanId.split('/')
  const provider = parts.length > 1 ? parts[0] : ''
  const modelPart = parts.length > 1 ? parts[1] : parts[0]

  const formatWord = (w: string) => {
    if (/^[0-9]+[a-z]?$/i.test(w)) return w.toUpperCase()
    const lower = w.toLowerCase()
    if (lower === 'gpt') return 'GPT'
    if (lower === 'oss') return 'OSS'
    if (lower === 'ai') return 'AI'
    if (lower === 'glm') return 'GLM'
    if (lower === 'lfm') return 'LFM'
    if (lower === 'vl') return 'VL'
    if (lower === 'it') return 'IT'
    if (lower === 'instruct') return 'Instruct'
    if (lower === 'preview') return 'Preview'
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }

  const cleanProvider = provider
    ? provider
        .split(/[-_]/)
        .map(formatWord)
        .join(' ')
    : ''

  const cleanModel = modelPart
    ? modelPart
        .split(/[-_]/)
        .map(formatWord)
        .join(' ')
    : ''

  const displayName = cleanProvider ? `${cleanProvider} ${cleanModel}` : cleanModel
  return isFree ? `${displayName} (free)` : displayName
}
