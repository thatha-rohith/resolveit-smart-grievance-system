import { createContext, useState, useEffect, useContext } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for token on initial load
  useEffect(() => {
    console.log('🔐 AuthProvider initialized')
    const token = localStorage.getItem('token')
    console.log('🔐 Token in localStorage:', token ? `Present (${token.length} chars)` : 'Missing')
    
    if (token) {
      fetchUser(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (token) => {
    try {
      console.log('👤 Fetching user info with token...')
      
      const userData = await authAPI.getMe()
      console.log('✅ User fetched:', userData)
      
      if (userData.user) {
        setUser(userData.user)
      } else if (userData.success && userData.data) {
        setUser(userData.data)
      } else if (userData.id) {
        setUser(userData)
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error)
      // If token is invalid, clear it
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      console.log('🔐 Login attempt for:', email)
      
      const data = await authAPI.login({ email, password })
      console.log('✅ Login response:', data)
      
      if (data.token && data.user) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return { success: true, user: data.user }
      } else if (data.success) {
        localStorage.setItem('token', data.token)
        setUser(data.user || data.data)
        return { success: true, user: data.user || data.data }
      } else {
        return { 
          success: false, 
          message: data.error || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      return { 
        success: false, 
        message: error.message || 'Network error. Please try again.' 
      }
    }
  }

  const register = async (name, email, password) => {
    try {
      console.log('📝 Register attempt for:', email)
      
      const data = await authAPI.register({ name, email, password })
      console.log('✅ Register response:', data)
      
      if (data.success) {
        // After successful registration, login the user
        const loginResult = await login(email, password)
        return loginResult
      } else {
        return { 
          success: false, 
          message: data.error || 'Registration failed' 
        }
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      return { 
        success: false, 
        message: error.message || 'Network error. Please try again.' 
      }
    }
  }

  const logout = () => {
    console.log('👋 Logging out...')
    localStorage.removeItem('token')
    setUser(null)
  }

  const getToken = () => {
    return localStorage.getItem('token')
  }

  const hasRole = (role) => {
    if (!user) return false
    return user.role === role
  }

  const isAdmin = () => {
    return user && user.role === 'ADMIN'
  }

  const isEmployee = () => {
    return user && (user.role === 'EMPLOYEE' || user.role === 'ADMIN')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    getToken,
    hasRole,
    isAdmin,
    isEmployee,
    isAuthenticated: !!user && !!localStorage.getItem('token')
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}