import React, { useState } from 'react'

const API_URL = 'https://mai.val.run'

interface AuthProps {
  onSuccess: (token: string, tier: string, email: string) => void
  onCancel: () => void
}

export function AuthModal({ onSuccess, onCancel }: AuthProps) {
  const [view, setView] = useState<'signin' | 'register' | 'verify'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyAction, setVerifyAction] = useState<'login' | 'register'>('login')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion')
      
      if (data.status === 'verification_required') {
        setVerifyAction('login')
        setView('verify')
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
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur d'inscription")
      
      if (data.status === 'verification_required') {
        setVerifyAction('register')
        setView('verify')
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
    setLoading(true)
    try {
      const endpoint = verifyAction === 'login' ? '/verify-login' : '/verify-register'
      const payload = verifyAction === 'login' 
        ? { email, code } 
        : { email, username, password, code }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')
      
      localStorage.setItem('mai_token', data.token)
      onSuccess(data.token, data.tier, email)
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
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: authFadeIn 0.3s ease;
        }
        .auth-modal {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          width: 400px;
          padding: 32px;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          transform: translateY(0);
          animation: authSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (prefers-color-scheme: dark) {
          .auth-modal {
            background: #1c1c1e;
            color: #f5f5f7;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          }
        }
        .auth-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        .auth-subtitle {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #888;
        }
        .auth-error {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 20px;
        }
        @media (prefers-color-scheme: dark) {
          .auth-error {
            background: rgba(229, 57, 53, 0.15);
            color: #ef5350;
          }
        }
        .auth-input {
          width: 100%;
          padding: 12px 16px;
          margin-bottom: 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
          box-sizing: border-box;
          transition: border-color 0.2s;
          background: transparent;
          color: inherit;
        }
        @media (prefers-color-scheme: dark) {
          .auth-input { border-color: #333; }
        }
        .auth-input:focus {
          outline: none;
          border-color: #0066ff;
        }
        .auth-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .auth-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .auth-btn-secondary {
          background: transparent;
          color: #666;
        }
        .auth-btn-secondary:hover {
          background: rgba(0,0,0,0.05);
        }
        @media (prefers-color-scheme: dark) {
          .auth-btn-secondary { color: #aaa; }
          .auth-btn-secondary:hover { background: rgba(255,255,255,0.1); }
        }
        .auth-btn-primary {
          background: #0066ff;
          color: white;
        }
        .auth-btn-primary:hover:not(:disabled) {
          background: #0055d4;
          transform: translateY(-1px);
        }
        .auth-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div className="auth-overlay" onClick={onCancel}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          {view === 'signin' && (
            <form onSubmit={handleSignIn}>
              <h3 className="auth-title">Connexion à mAI</h3>
              <p className="auth-subtitle">Ravi de vous revoir. Veuillez vous connecter.</p>
              {error && <div className="auth-error">{error}</div>}
              <input 
                className="auth-input"
                type="text" 
                placeholder="Email ou nom d'utilisateur" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
              <input 
                className="auth-input"
                type="password" 
                placeholder="Mot de passe" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <div className="auth-buttons">
                <button type="button" className="auth-btn auth-btn-secondary" onClick={() => setView('register')}>
                  Créer un compte
                </button>
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? 'Chargement...' : 'Se connecter'}
                </button>
              </div>
            </form>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegister}>
              <h3 className="auth-title">Créer un compte mAI</h3>
              <p className="auth-subtitle">Rejoignez-nous pour accéder à l'IA.</p>
              {error && <div className="auth-error">{error}</div>}
              <input 
                className="auth-input"
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
              <input 
                className="auth-input"
                type="text" 
                placeholder="Nom d'utilisateur" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
              <input 
                className="auth-input"
                type="password" 
                placeholder="Mot de passe" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <div className="auth-buttons">
                <button type="button" className="auth-btn auth-btn-secondary" onClick={() => setView('signin')}>
                  Déjà un compte ?
                </button>
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? 'Chargement...' : "S'inscrire"}
                </button>
              </div>
            </form>
          )}

          {view === 'verify' && (
            <form onSubmit={handleVerify}>
              <h3 className="auth-title">Vérification requise</h3>
              <p className="auth-subtitle">Veuillez entrer le code reçu par email.</p>
              {error && <div className="auth-error">{error}</div>}
              <input 
                className="auth-input"
                type="text" 
                placeholder="Code de vérification (ex: 123456)" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                required 
              />
              <div className="auth-buttons">
                <button type="button" className="auth-btn auth-btn-secondary" onClick={() => setView('signin')}>
                  Annuler
                </button>
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? 'Vérification...' : 'Vérifier'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
