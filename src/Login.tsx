import { useState } from 'react'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const validEmail = import.meta.env.VITE_BACKOFFICE_EMAIL
    const validPassword = import.meta.env.VITE_BACKOFFICE_PASSWORD

    await new Promise(r => setTimeout(r, 800))

    if (email === validEmail && password === validPassword) {
      localStorage.setItem('bo_auth', 'true')
      localStorage.setItem('bo_ts', Date.now().toString())
      onLogin()
    } else {
      setError('Identifiants incorrects')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#080A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none'
      }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: '#1d4ed8',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(37,99,235,0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="9" width="16" height="11" rx="2" fill="rgba(255,255,255,0.2)"/>
              <rect x="3" y="14" width="16" height="6" rx="2" fill="rgba(255,255,255,0.15)"/>
              <rect x="9" y="2" width="4" height="12" rx="2" fill="white"/>
              <polygon points="11,0 6,7 16,7" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Stockio<span style={{ color: '#3B82F6' }}>XL</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Back Office Éditeur
          </p>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '36px',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'white', marginBottom: '6px' }}>Accès restreint</h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>Réservé à l'équipe StockioXL</p>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', color: '#FCA5A5', marginBottom: '20px' }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="votre@email.com"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.875rem', color: 'white', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontWeight: '500' }}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.875rem', color: 'white', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <button
            onClick={handleLogin} disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(37,99,235,0.5)' : '#2563EB', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '0.875rem', fontWeight: '600', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
          >
            {loading ? 'Vérification...' : 'Accéder au back office →'}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>
          © 2026 StockioXL · Accès sécurisé
        </p>
      </div>
    </div>
  )
}
