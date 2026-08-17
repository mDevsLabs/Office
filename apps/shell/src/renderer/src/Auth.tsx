import React, { useState } from 'react'
import { useI18n } from './locale'

const API_URL = 'https://mai.val.run'

interface AuthProps {
  onSuccess: (token: string, tier: string, email: string) => void
  onCancel: () => void
}

export function AuthModal({ onSuccess, onCancel }: AuthProps) {
  const { t } = useI18n()
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
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {view === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Connexion à mAI</h3>
            {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
            <input 
              type="text" 
              placeholder="Email ou nom d'utilisateur" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="password" 
              placeholder="Mot de passe" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setView('register')}>
                Créer un compte
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Chargement...' : 'Se connecter'}
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Créer un compte mAI</h3>
            {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="Nom d'utilisateur" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="password" 
              placeholder="Mot de passe" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setView('signin')}>
                Déjà inscrit ?
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Chargement...' : "S'inscrire"}
              </button>
            </div>
          </form>
        )}

        {view === 'verify' && (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Vérification</h3>
            <p style={{ margin: 0 }}>Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.</p>
            {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
            <input 
              type="text" 
              placeholder="Code OTP (ex: 123456)" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              required 
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', letterSpacing: '2px', textAlign: 'center' }}
            />
            <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setView('signin')}>
                Annuler
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Vérification...' : 'Valider'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
