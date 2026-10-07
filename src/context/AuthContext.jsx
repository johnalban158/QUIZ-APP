import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api, getStoredUser, setStoredUser, setToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const staffLogin = useCallback(async (email, password) => {
    const data = await api('/auth/staff/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    setToken(data.token)
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setStoredUser(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, staffLogin, logout }), [user, login, staffLogin, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}