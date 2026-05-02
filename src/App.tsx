import { useState, useEffect } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App() {
  const [auth, setAuth] = useState(false)

  useEffect(() => {
    const isAuth = localStorage.getItem('bo_auth') === 'true'
    const ts = parseInt(localStorage.getItem('bo_ts') ?? '0')
    const expired = Date.now() - ts > 8 * 60 * 60 * 1000 // 8h
    if (isAuth && !expired) setAuth(true)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bo_auth')
    localStorage.removeItem('bo_ts')
    setAuth(false)
  }

  return auth
    ? <Dashboard onLogout={handleLogout} />
    : <Login onLogin={() => setAuth(true)} />
}