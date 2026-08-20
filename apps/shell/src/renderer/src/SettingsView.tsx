import React, { useEffect, useState } from 'react'
import { useI18n } from './locale'
import type { Lang } from '@genoffice/i18n'

const API_URL = 'https://mai.val.run'

const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'ru', label: 'Русский' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'ar', label: 'العربية' },
  { value: 'he', label: 'עברית' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'th', label: 'ไทย' },
] as const

interface SettingsViewProps {
  onClose?: () => void
  initialTab?: 'profile' | 'ai-usage' | 'api-usage' | 'preferences'
}

export function SettingsView({ onClose, initialTab = 'profile' }: SettingsViewProps) {
  const { lang, setLang, t } = useI18n()
  const [activeTab, setActiveTab] = useState<'profile' | 'ai-usage' | 'api-usage' | 'preferences'>(initialTab)

  const token = localStorage.getItem('mai_token') || ''
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Profile State ──
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [tier, setTier] = useState('Free')
  const [newsletter, setNewsletter] = useState(false)
  const [notifyLimits, setNotifyLimits] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // ── AI Usage State ──
  const [aiTokensUsed, setAiTokensUsed] = useState(0)
  const [aiLimit, setAiLimit] = useState(2_000_000)
  const [aiResetAt, setAiResetAt] = useState('')
  const [upgradeCode, setUpgradeCode] = useState('')
  const [upgrading, setUpgrading] = useState(false)

  // ── API Usage State ──
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState('0.1.0')

  // Load User & Usage Data
  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      // 1. Load Usage & Profile
      const usageRes = await fetch(`${API_URL}/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (usageRes.ok) {
        const u = await usageRes.json()
        setUsername(u.username || '')
        setEmail(u.email || '')
        setPhone(u.phone || '')
        setAvatarUrl(u.avatarUrl || '')
        setTier(u.tier || 'Free')
        setAiTokensUsed(u.tokensUsed || 0)
        setAiLimit(u.limit || 2_000_000)
        setAiResetAt(u.resetAt || '')
        if (u.avatarUrl) localStorage.setItem('mai_avatar', u.avatarUrl)
        if (u.username) localStorage.setItem('mai_username', u.username)
        if (u.tier) localStorage.setItem('mai_tier', u.tier)
      }

      // 2. Load API Keys
      const apiRes = await fetch(`${API_URL}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (apiRes.ok) {
        const a = await apiRes.json()
        if (a.keys && a.keys.length > 0) {
          setApiKeys(a.keys)
          if (a.keys[0]?.api_key) {
            localStorage.setItem('mai_api_key', a.keys[0].api_key)
          }
        }
      }

      // 3. App Version
      void window.aiOffice?.getAppVersion?.().then((v) => {
        if (v) setAppVersion(v)
      })
    } catch (err: any) {
      console.error('Erreur chargement paramètres:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  // Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return

    setAvatarUploading(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await fetch(`${API_URL}/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload de l'avatar")

      setAvatarUrl(data.avatarUrl)
      localStorage.setItem('mai_avatar', data.avatarUrl)
      setStatusMsg({ type: 'success', text: 'Photo de profil mise à jour avec succès !' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message })
    } finally {
      setAvatarUploading(false)
    }
  }

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!currentPassword) {
      setStatusMsg({ type: 'error', text: 'Le mot de passe actuel est requis pour enregistrer les modifications.' })
      return
    }

    setLoading(true)
    setStatusMsg(null)

    try {
      const res = await fetch(`${API_URL}/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          currentPassword,
          password: newPassword.trim() || undefined,
          newsletter,
          notify_limits: notifyLimits,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour du profil')

      setStatusMsg({ type: 'success', text: 'Profil mis à jour avec succès !' })
      setCurrentPassword('')
      setNewPassword('')
      if (data.username) localStorage.setItem('mai_username', data.username)
      if (data.email) localStorage.setItem('mai_email', data.email)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Upgrade Code Submit
  const handleUpgradeCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!upgradeCode.trim() || !token) return

    setUpgrading(true)
    setStatusMsg(null)

    try {
      const res = await fetch(`${API_URL}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: upgradeCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide ou expiré')

      if (data.token) localStorage.setItem('mai_token', data.token)
      if (data.tier) {
        setTier(data.tier)
        localStorage.setItem('mai_tier', data.tier)
      }
      setUpgradeCode('')
      setStatusMsg({ type: 'success', text: `Félicitations ! Votre forfait est désormais surclassé en ${data.tier} 🎉` })
      loadData()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message })
    } finally {
      setUpgrading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const initial = username ? username[0].toUpperCase() : email ? email[0].toUpperCase() : 'U'
  const percentUsed = Math.min(100, Math.round((aiTokensUsed / (aiLimit || 1)) * 100))

  return (
    <div className="settings-page">
      <style>{`
        .settings-page {
          display: flex;
          height: 100%;
          width: 100%;
          background: #fafafa;
          color: #18181b;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
          overflow: hidden;
        }
        @media (prefers-color-scheme: dark) {
          .settings-page {
            background: #121214;
            color: #f4f4f5;
          }
        }
        .settings-nav {
          width: 260px;
          min-width: 240px;
          background: #ffffff;
          border-right: 1px solid #e4e4e7;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          box-sizing: border-box;
        }
        @media (prefers-color-scheme: dark) {
          .settings-nav {
            background: #18181b;
            border-right-color: #27272a;
          }
        }
        .settings-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.4px;
          margin-bottom: 24px;
          padding-left: 8px;
        }
        .settings-header-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
        }
        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #71717a;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
          text-align: left;
        }
        .settings-tab-btn:hover {
          background: #f4f4f5;
          color: #18181b;
        }
        @media (prefers-color-scheme: dark) {
          .settings-tab-btn:hover {
            background: #27272a;
            color: #f4f4f5;
          }
        }
        .settings-tab-btn.active {
          background: #e0e7ff;
          color: #4338ca;
          font-weight: 600;
        }
        @media (prefers-color-scheme: dark) {
          .settings-tab-btn.active {
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
          }
        }
        .settings-content-area {
          flex: 1;
          overflow-y: auto;
          padding: 36px 48px;
          box-sizing: border-box;
        }
        .settings-card {
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        @media (prefers-color-scheme: dark) {
          .settings-card {
            background: #18181b;
            border-color: #27272a;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
        }
        .settings-card-title {
          font-size: 17px;
          font-weight: 600;
          margin: 0 0 6px 0;
          letter-spacing: -0.3px;
        }
        .settings-card-sub {
          font-size: 13px;
          color: #71717a;
          margin: 0 0 20px 0;
        }
        .settings-avatar-row {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
        }
        .settings-avatar-img {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 2px solid #6366f1;
        }
        .settings-avatar-initials {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .settings-input-group {
          margin-bottom: 18px;
        }
        .settings-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          color: #3f3f46;
        }
        @media (prefers-color-scheme: dark) {
          .settings-label { color: #d4d4d8; }
        }
        .settings-input {
          width: 100%;
          max-width: 440px;
          padding: 10px 14px;
          border: 1px solid #d4d4d8;
          border-radius: 10px;
          font-size: 14px;
          background: #f9fafb;
          color: inherit;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        @media (prefers-color-scheme: dark) {
          .settings-input {
            background: #27272a;
            border-color: #3f3f46;
          }
        }
        .settings-input:focus {
          outline: none;
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        @media (prefers-color-scheme: dark) {
          .settings-input:focus {
            background: #18181b;
            border-color: #818cf8;
          }
        }
        .settings-btn {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .settings-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
        }
        .settings-btn-primary:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .settings-btn-secondary {
          background: #f4f4f5;
          color: #18181b;
          border: 1px solid #e4e4e7;
        }
        @media (prefers-color-scheme: dark) {
          .settings-btn-secondary {
            background: #27272a;
            color: #f4f4f5;
            border-color: #3f3f46;
          }
        }
        .settings-progress-track {
          height: 12px;
          background: #e4e4e7;
          border-radius: 6px;
          overflow: hidden;
          margin: 12px 0;
        }
        @media (prefers-color-scheme: dark) {
          .settings-progress-track { background: #27272a; }
        }
        .settings-progress-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.4s ease;
          background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 80%, #ec4899 100%);
        }
        .settings-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .settings-badge-free { background: #e0e7ff; color: #4338ca; }
        .settings-badge-plus { background: #dcfce7; color: #15803d; }
        .settings-badge-pro { background: #fae8ff; color: #86198f; }
        .settings-badge-max { background: #fef08a; color: #854d0e; }
        .settings-alert {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .settings-alert-success { background: rgba(16, 185, 129, 0.15); color: #059669; }
        .settings-alert-error { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
      `}</style>

      {/* ── Sidebar Navigation ── */}
      <aside className="settings-nav">
        <div className="settings-header-title">
          <div className="settings-header-icon">⚙️</div>
          <span>Paramètres</span>
        </div>

        <button
          className={`settings-tab-btn${activeTab === 'profile' ? ' active' : ''}`}
          onClick={() => { setActiveTab('profile'); setStatusMsg(null); }}
        >
          <span>👤</span>
          <span>Mon profil</span>
        </button>

        <button
          className={`settings-tab-btn${activeTab === 'ai-usage' ? ' active' : ''}`}
          onClick={() => { setActiveTab('ai-usage'); setStatusMsg(null); }}
        >
          <span>📊</span>
          <span>Consommation IA</span>
        </button>

        <button
          className={`settings-tab-btn${activeTab === 'api-usage' ? ' active' : ''}`}
          onClick={() => { setActiveTab('api-usage'); setStatusMsg(null); }}
        >
          <span>🔑</span>
          <span>Consommation API</span>
        </button>

        <button
          className={`settings-tab-btn${activeTab === 'preferences' ? ' active' : ''}`}
          onClick={() => { setActiveTab('preferences'); setStatusMsg(null); }}
        >
          <span>🌍</span>
          <span>Préférences et langue</span>
        </button>

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(128,128,128,0.15)' }}>
          {onClose && (
            <button className="settings-tab-btn" onClick={onClose}>
              <span>←</span>
              <span>Retour à l'accueil</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="settings-content-area">
        {statusMsg && (
          <div className={`settings-alert settings-alert-${statusMsg.type}`}>
            <span>{statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── TAB 1: MON PROFIL ── */}
        {activeTab === 'profile' && (
          <div style={{ maxWidth: '640px' }}>
            <div className="settings-card">
              <h3 className="settings-card-title">Photo de profil</h3>
              <p className="settings-card-sub">Personnalisez votre avatar visible dans l'application.</p>

              <div className="settings-avatar-row">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="settings-avatar-img" />
                ) : (
                  <div className="settings-avatar-initials">{initial}</div>
                )}
                <div>
                  <label className="settings-btn settings-btn-secondary" style={{ display: 'inline-block' }}>
                    {avatarUploading ? 'Upload en cours...' : 'Changer la photo'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                  </label>
                  <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '6px' }}>
                    Format PNG, JPG ou WebP (max 5MB)
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="settings-card">
              <h3 className="settings-card-title">Informations du compte</h3>
              <p className="settings-card-sub">Modifiez vos identifiants et coordonnées.</p>

              <div className="settings-input-group">
                <label className="settings-label">Nom d'utilisateur</label>
                <input
                  className="settings-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="settings-input-group">
                <label className="settings-label">Adresse e-mail</label>
                <input
                  className="settings-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="settings-input-group">
                <label className="settings-label">Numéro de téléphone (optionnel)</label>
                <input
                  className="settings-input"
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="settings-input-group" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(128,128,128,0.15)' }}>
                <label className="settings-label">Nouveau mot de passe (optionnel)</label>
                <input
                  className="settings-input"
                  type="password"
                  placeholder="Laisser vide pour ne pas changer"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="settings-input-group">
                <label className="settings-label" style={{ color: '#e11d48' }}>
                  Mot de passe actuel (Requis pour valider) *
                </label>
                <input
                  className="settings-input"
                  type="password"
                  placeholder="Votre mot de passe actuel"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB 2: CONSOMMATION IA ── */}
        {activeTab === 'ai-usage' && (
          <div style={{ maxWidth: '640px' }}>
            <div className="settings-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="settings-card-title" style={{ margin: 0 }}>Quota Hebdomadaire de Tokens</h3>
                <span className={`settings-badge settings-badge-${tier.toLowerCase()}`}>Forfait {tier}</span>
              </div>
              <p className="settings-card-sub">
                Chaque requête IA consomme la somme des tokens du prompt et de la réponse.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                <span>{aiTokensUsed.toLocaleString()} tokens utilisés</span>
                <span style={{ color: '#71717a' }}>{aiLimit.toLocaleString()} max</span>
              </div>

              <div className="settings-progress-track">
                <div
                  className="settings-progress-fill"
                  style={{
                    width: `${percentUsed}%`,
                    background: percentUsed > 90 ? '#ef4444' : undefined,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#71717a' }}>
                <span>{percentUsed}% consommés</span>
                <span>{(aiLimit - aiTokensUsed).toLocaleString()} restants</span>
              </div>

              {aiResetAt && (
                <div style={{ marginTop: '16px', fontSize: '12px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔄</span>
                  <span>Réinitialisation le {new Date(aiResetAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Code de Surclassement</h3>
              <p className="settings-card-sub">Débloquez un forfait Plus, Pro ou Max avec votre code d'accès.</p>

              <form onSubmit={handleUpgradeCode} style={{ display: 'flex', gap: '12px' }}>
                <input
                  className="settings-input"
                  style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                  placeholder="EX: PLUS2026"
                  value={upgradeCode}
                  onChange={(e) => setUpgradeCode(e.target.value)}
                />
                <button type="submit" className="settings-btn settings-btn-primary" disabled={upgrading || !upgradeCode.trim()}>
                  {upgrading ? 'Vérification...' : 'Appliquer'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 3: CONSOMMATION API ── */}
        {activeTab === 'api-usage' && (
          <div style={{ maxWidth: '640px' }}>
            <div className="settings-card">
              <h3 className="settings-card-title">Clé API Développeur</h3>
              <p className="settings-card-sub">
                Utilisez votre clé API pour intégrer mAI dans vos propres applications ou requêter l'API via <code>https://mai.val.run/v1</code>.
              </p>

              {apiKeys.length === 0 ? (
                <div style={{ color: '#71717a', fontSize: '14px' }}>Aucune clé API trouvée.</div>
              ) : (
                apiKeys.map((k) => {
                  const isVisible = showApiKey[k.api_key]
                  const displayVal = isVisible ? k.api_key : k.api_key.substring(0, 10) + '••••••••••••••••••••••••'
                  return (
                    <div key={k.api_key} style={{ background: '#f4f4f5', padding: '16px', borderRadius: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Clé mProjects ({k.plan || 'Free'})</span>
                        <span style={{ fontSize: '12px', color: '#71717a' }}>{k.request_count || 0} requêtes ce mois</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ flex: 1, padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #d4d4d8', fontSize: '13px', fontFamily: 'monospace' }}>
                          {displayVal}
                        </code>
                        <button
                          className="settings-btn settings-btn-secondary"
                          onClick={() => setShowApiKey((prev) => ({ ...prev, [k.api_key]: !prev[k.api_key] }))}
                          title={isVisible ? 'Masquer' : 'Afficher'}
                        >
                          {isVisible ? '🙈' : '👁️'}
                        </button>
                        <button
                          className="settings-btn settings-btn-secondary"
                          onClick={() => copyToClipboard(k.api_key, k.api_key)}
                          title="Copier"
                        >
                          {copiedKey === k.api_key ? '✓ Copié' : '📋 Copier'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Documentation Rapide</h3>
              <p className="settings-card-sub">Exemple d'appel cURL vers l'API mAI :</p>
              <pre style={{ background: '#18181b', color: '#f4f4f5', padding: '14px', borderRadius: '10px', fontSize: '12px', overflowX: 'auto' }}>
{`curl https://mai.val.run/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKeys[0]?.api_key || 'VOTRE_CLE_API'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "google/gemini-2.5-flash:free",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'`}
              </pre>
            </div>
          </div>
        )}

        {/* ── TAB 4: PRÉFÉRENCES ET LANGUE ── */}
        {activeTab === 'preferences' && (
          <div style={{ maxWidth: '640px' }}>
            <div className="settings-card">
              <h3 className="settings-card-title">Langue de l'interface</h3>
              <p className="settings-card-sub">Choisissez la langue d'affichage de mAI Office.</p>

              <div className="settings-input-group">
                <select
                  className="settings-input"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                >
                  {LANG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">À propos de mAI Office</h3>
              <p className="settings-card-sub">Informations sur votre installation logicielle.</p>
              <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
                <div><strong>Version :</strong> {appVersion}</div>
                <div><strong>Éditeur :</strong> mDevsLabs</div>
                <div><strong>API Backend :</strong> https://mai.val.run</div>
                <div><strong>Licence :</strong> MIT</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
