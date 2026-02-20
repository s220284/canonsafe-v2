import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orgOverride, setOrgOverride] = useState(() => {
    const saved = localStorage.getItem('orgOverride')
    const savedName = localStorage.getItem('orgOverrideName')
    return saved ? { id: parseInt(saved), name: savedName || `Org #${saved}` } : null
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData)
    localStorage.setItem('token', res.data.access_token)
    const me = await api.get('/auth/me')
    setUser(me.data)
  }

  const register = async (email, password, fullName, orgName) => {
    await api.post('/auth/register', {
      email, password, full_name: fullName, org_name: orgName,
    })
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('orgOverride')
    localStorage.removeItem('orgOverrideName')
    setUser(null)
    setOrgOverride(null)
  }

  const refreshUser = async () => {
    try {
      const me = await api.get('/auth/me')
      setUser(me.data)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  // God Mode: switch into another org's context
  const switchOrg = (orgId, orgName) => {
    localStorage.setItem('orgOverride', String(orgId))
    localStorage.setItem('orgOverrideName', orgName || `Org #${orgId}`)
    setOrgOverride({ id: orgId, name: orgName || `Org #${orgId}` })
  }

  const exitOrgOverride = () => {
    localStorage.removeItem('orgOverride')
    localStorage.removeItem('orgOverrideName')
    setOrgOverride(null)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshUser,
      orgOverride, switchOrg, exitOrgOverride,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
