import React, { useState, useEffect } from 'react'

const API_URL = 'https://mai.val.run'

interface AuthProps {
  onSuccess: (token: string, tier: string, email: string, apiKey?: string, username?: string) => void
  onCancel: () => void
}

export function AuthModal({ onSuccess, onCancel }: AuthProps) {
  const [view, setView] = useState<'signin' | 'register' | 'verify'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyAction, setVerifyAction] = useState<'login' | 'register'>('login')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    let timer: any
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion')

      if (data.status === 'verification_required') {
        setVerifyAction('login')
        setView('verify')
        setResendCooldown(60)
        setSuccessMsg(`Un code de vérification à 6 chiffres a été envoyé à ${email.trim()}.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur d'inscription")

      if (data.status === 'verification_required') {
        setVerifyAction('register')
        setView('verify')
        setResendCooldown(60)
        setSuccessMsg(`Un code de vérification a été envoyé à ${email.trim()}.`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const endpoint = verifyAction === 'login' ? '/verify-login' : '/verify-register'
      const payload =
        verifyAction === 'login'
          ? { email: email.trim(), code: code.trim() }
          : { email: email.trim(), username: username.trim(), password, code: code.trim() }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')

      const token = data.token || ''
      const tier = data.tier || 'Free'
      const apiKey = data.apiKey || ''
      const registeredUsername = username.trim() || email.split('@')[0]

      localStorage.setItem('mai_token', token)
      localStorage.setItem('mai_email', email.trim())
      localStorage.setItem('mai_tier', tier)
      if (apiKey) localStorage.setItem('mai_api_key', apiKey)
      if (registeredUsername) localStorage.setItem('mai_username', registeredUsername)

      onSuccess(token, tier, email.trim(), apiKey, registeredUsername)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: verifyAction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi du code")

      setResendCooldown(60)
      setSuccessMsg('Nouveau code envoyé avec succès !')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .auth-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
          animation: authFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .auth-modal {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
          width: 420px;
          max-width: 90vw;
          padding: 32px;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          animation: authSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        @media (prefers-color-scheme: dark) {
          .auth-modal {
            background: #18181b;
            color: #f4f4f5;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
          }
        }
        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-logo-badge {
          width: 54px;
          height: 54px;
          margin: 0 auto 12px auto;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
          box-shadow: 0 8px 16px -4px rgba(139, 92, 246, 0.4);
        }
        .auth-logo-badge svg {
          width: 32px;
          height: 32px;
          fill: #ffffff;
        }
        .auth-title {
          margin: 0 0 6px 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.4px;
        }
        .auth-subtitle {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }
        @media (prefers-color-scheme: dark) {
          .auth-subtitle { color: #a1a1aa; }
        }
        .auth-alert-error {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        @media (prefers-color-scheme: dark) {
          .auth-alert-error {
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.35);
          }
        }
        .auth-alert-success {
          background: rgba(16, 185, 129, 0.12);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        @media (prefers-color-scheme: dark) {
          .auth-alert-success {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.35);
          }
        }
        .auth-form-group {
          margin-bottom: 14px;
        }
        .auth-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          color: #4b5563;
        }
        @media (prefers-color-scheme: dark) {
          .auth-label { color: #d4d4d8; }
        }
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          box-sizing: border-box;
          transition: all 0.2s;
          background: #f9fafb;
          color: inherit;
        }
        @media (prefers-color-scheme: dark) {
          .auth-input {
            background: #27272a;
            border-color: #3f3f46;
          }
        }
        .auth-input:focus {
          outline: none;
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        @media (prefers-color-scheme: dark) {
          .auth-input:focus {
            background: #18181b;
            border-color: #818cf8;
            box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.25);
          }
        }
        .auth-input-code {
          font-family: ui-monospace, monospace;
          font-size: 22px;
          letter-spacing: 6px;
          text-align: center;
          font-weight: 700;
        }
        .auth-buttons {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 24px;
        }
        .auth-btn {
          padding: 10px 18px;
          border-radius: 10px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .auth-btn-secondary {
          background: transparent;
          color: #6b7280;
        }
        .auth-btn-secondary:hover {
          background: rgba(0,0,0,0.06);
          color: #111827;
        }
        @media (prefers-color-scheme: dark) {
          .auth-btn-secondary { color: #a1a1aa; }
          .auth-btn-secondary:hover {
            background: rgba(255,255,255,0.08);
            color: #f4f4f5;
          }
        }
        .auth-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          flex: 1;
        }
        .auth-btn-primary:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
        }
        .auth-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .auth-footer-link {
          text-align: center;
          margin-top: 18px;
          font-size: 13px;
          color: #6b7280;
        }
        .auth-footer-link button {
          background: none;
          border: none;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
          padding: 0 4px;
        }
        .auth-footer-link button:hover {
          text-decoration: underline;
        }
        .auth-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
        }
        .auth-close:hover {
          color: #111827;
          background: rgba(0,0,0,0.05);
        }
        @media (prefers-color-scheme: dark) {
          .auth-close:hover {
            color: #f4f4f5;
            background: rgba(255,255,255,0.1);
          }
        }
        @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div className="auth-overlay" onClick={onCancel}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          <button className="auth-close" onClick={onCancel} title="Fermer">
            ✕
          </button>

          <div className="auth-header">
            <div className="auth-logo-badge">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h3 className="auth-title">
              {view === 'signin'
                ? 'Connexion à mAI Office'
                : view === 'register'
                ? 'Créer un compte mAI'
                : 'Vérification de sécurité'}
            </h3>
            <p className="auth-subtitle">
              {view === 'signin'
                ? 'Accédez à votre espace et à vos modèles d’IA'
                : view === 'register'
                ? 'Rejoignez mAI Office pour imaginer et créer plus vite'
                : 'Saisissez le code à 6 chiffres reçu par e-mail'}
            </p>
          </div>

          {error && <div className="auth-alert-error">{error}</div>}
          {successMsg && <div className="auth-alert-success">{successMsg}</div>}

          {view === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div className="auth-form-group">
                <label className="auth-label">E-mail ou nom d'utilisateur</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="exemple@domaine.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="auth-form-group">
                <label className="auth-label">Mot de passe</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-buttons">
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? 'Connexion en cours...' : 'Se connecter'}
                </button>
              </div>
              <div className="auth-footer-link">
                Pas encore de compte ?{' '}
                <button type="button" onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }}>
                  Créer un compte
                </button>
              </div>
            </form>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="auth-form-group">
                <label className="auth-label">Adresse e-mail</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="exemple@domaine.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="auth-form-group">
                <label className="auth-label">Nom d'utilisateur</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="MonPseudo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="auth-form-group">
                <label className="auth-label">Mot de passe</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="auth-buttons">
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? 'Création...' : "S'inscrire"}
                </button>
              </div>
              <div className="auth-footer-link">
                Vous avez déjà un compte ?{' '}
                <button type="button" onClick={() => { setView('signin'); setError(''); setSuccessMsg(''); }}>
                  Se connecter
                </button>
              </div>
            </form>
          )}

          {view === 'verify' && (
            <form onSubmit={handleVerify}>
              <div className="auth-form-group">
                <label className="auth-label" style={{ textAlign: 'center' }}>
                  Code de vérification (6 chiffres)
                </label>
                <input
                  className="auth-input auth-input-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#9ca3af' : '#6366f1',
                    fontSize: '13px',
                    cursor: resendCooldown > 0 ? 'default' : 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer un nouveau code'}
                </button>
              </div>
              <div className="auth-buttons">
                <button
                  type="button"
                  className="auth-btn auth-btn-secondary"
                  onClick={() => {
                    setView('signin')
                    setError('')
                    setSuccessMsg('')
                  }}
                >
                  Retour
                </button>
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading || code.length < 6}>
                  {loading ? 'Vérification...' : 'Valider & Accéder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
