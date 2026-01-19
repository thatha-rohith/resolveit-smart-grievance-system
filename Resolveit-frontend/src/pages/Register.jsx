import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { FaUser, FaEnvelope, FaLock, FaCheckCircle, FaGoogle, FaGithub, FaArrowRight, FaShieldAlt, FaCircleNotch, FaExclamationCircle } from 'react-icons/fa'
import './Register.css'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    setError('')
    setLoading(true)

    const result = await register(name, email, password)
    
    if (result.success) {
      navigate('/login')
    } else {
      setError(result.message)
    }
    
    setLoading(false)
  }

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  }

  return (
    <div className="auth-saas-container">
      <div className="auth-saas-card">
        
        {/* Left Side - Visual & Marketing */}
        <div className="auth-saas-visual">
          <div className="visual-content">
            <div className="brand-header">
              <div className="brand-logo-circle">
                <FaShieldAlt />
              </div>
              <h2>ResolveIt Enterprise</h2>
            </div>
            
            <div className="feature-slider">
              <h3>Join the Resolution Network</h3>
              <p>Connect with thousands of active citizens and track community issues in real-time with our enterprise-grade platform.</p>
              
              <div className="trust-badges">
                <div className="badge-item">
                  <FaCheckCircle className="badge-icon" /> 
                  <span>Secure Encryption</span>
                </div>
                <div className="badge-item">
                  <FaCheckCircle className="badge-icon" /> 
                  <span>Real-time Tracking</span>
                </div>
                <div className="badge-item">
                  <FaCheckCircle className="badge-icon" /> 
                  <span>Official Support</span>
                </div>
              </div>
            </div>

            <div className="visual-footer">
              <p>&copy; 2025 ResolveIt Inc.</p>
            </div>
          </div>
          <div className="visual-overlay"></div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="auth-saas-form-wrapper">
          <div className="form-header">
            <h1>Create Account</h1>
            <p className="subtitle">Start managing complaints efficiently.</p>
          </div>

          {error && (
            <div className="saas-error-banner">
              <FaExclamationCircle />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="saas-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrapper">
                <FaUser className="field-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Work Email</label>
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

            <div className="form-row">
              <div className="form-group half">
                <label>Password</label>
                <div className="input-icon-wrapper">
                  <FaLock className="field-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              <div className="form-group half">
                <label>Confirm</label>
                <div className="input-icon-wrapper">
                  <FaLock className="field-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="password-meter">
                <div className={`strength-bar level-${getPasswordStrength()}`}></div>
                <span>
                  {getPasswordStrength() === 1 ? 'Weak' : getPasswordStrength() === 2 ? 'Medium' : 'Strong'}
                </span>
              </div>
            )}

            <div className="form-check-custom">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="label-text">
                  I agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className="saas-submit-btn" 
              disabled={loading || !agreeTerms}
            >
              {loading ? (
                <>
                  <FaCircleNotch className="spin" /> Creating Account...
                </>
              ) : (
                <>
                  Get Started <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>Or register with</span>
          </div>

          <div className="social-login-grid">
            <button type="button" className="social-btn">
              <FaGoogle /> Google
            </button>
            <button type="button" className="social-btn">
              <FaGithub /> GitHub
            </button>
          </div>

          <div className="auth-footer-link">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register