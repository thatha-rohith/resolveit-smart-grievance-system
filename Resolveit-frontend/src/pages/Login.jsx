import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { FaEnvelope, FaLock, FaSignInAlt, FaGoogle, FaGithub, FaFacebook, FaCircleNotch, FaExclamationCircle, FaShieldAlt, FaArrowRight } from 'react-icons/fa'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/public-complaints')
    } else {
      setError(result.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-saas-container">
      <div className="auth-saas-card">
        
        {/* Left Side - Visual Branding */}
        <div className="auth-saas-visual">
          <div className="visual-content">
            <div className="brand-header">
              <div className="brand-logo-circle">
                <FaShieldAlt />
              </div>
              <h2>ResolveIt Enterprise</h2>
            </div>
            
            <div className="hero-text">
              <h1>Welcome back to your workspace.</h1>
              <p>Manage complaints, track resolutions, and engage with your community efficiently.</p>
            </div>

            <div className="visual-footer">
              <div className="stat-row">
                <div>
                  <strong>10k+</strong>
                  <span>Issues Resolved</span>
                </div>
                <div className="divider-vertical"></div>
                <div>
                  <strong>99%</strong>
                  <span>Uptime</span>
                </div>
              </div>
            </div>
          </div>
          <div className="visual-overlay"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="auth-saas-form-wrapper">
          <div className="form-header">
            <h1>Sign In</h1>
            <p className="subtitle">Enter your credentials to access the dashboard.</p>
          </div>

          {error && (
            <div className="saas-error-banner">
              <FaExclamationCircle />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="saas-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <FaEnvelope className="field-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <FaLock className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <label className="checkbox-container">
                <input type="checkbox" id="remember" />
                <span className="checkmark"></span>
                <span className="label-text">Remember me</span>
              </label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="saas-submit-btn" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaCircleNotch className="spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In <FaArrowRight className="ms-2" />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>Or continue with</span>
          </div>

          <div className="social-login-grid">
            <button type="button" className="social-btn" title="Sign in with Google">
              <FaGoogle />
            </button>
            <button type="button" className="social-btn" title="Sign in with GitHub">
              <FaGithub />
            </button>
            <button type="button" className="social-btn" title="Sign in with Facebook">
              <FaFacebook />
            </button>
          </div>

          <div className="auth-footer-link">
            Don't have an account? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login