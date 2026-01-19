import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const TestAuth = () => {
  const { user, loading, login, logout } = useAuth()
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    console.log('=== AUTH TEST COMPONENT MOUNTED ===')
    console.log('User:', user)
    console.log('Loading:', loading)
    console.log('Token in localStorage:', localStorage.getItem('token'))
    console.log('===================================')
  }, [user, loading])

  const testAuthMe = async () => {
    setTesting(true)
    setTestResult('Testing /auth/me...')
    
    try {
      const token = localStorage.getItem('token')
      console.log('🔍 Testing /auth/me with token:', token)
      
      const response = await fetch('http://localhost:8080/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      setTestResult(`✅ /auth/me SUCCESS - Status: ${response.status}, User: ${data.email}`)
    } catch (error) {
      console.error('Test error:', error)
      setTestResult(`❌ /auth/me FAILED - ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testComplaintsSubmit = async () => {
    setTesting(true)
    setTestResult('Testing /complaints/submit...')
    
    try {
      const token = localStorage.getItem('token')
      console.log('🔍 Testing /complaints/submit with token:', token)
      
      const response = await fetch('http://localhost:8080/complaints/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Complaint from TestAuth',
          category: 'Test',
          description: 'This is a test complaint from the TestAuth component',
          urgency: 'NORMAL',
          anonymous: false
        })
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      setTestResult(`✅ /complaints/submit SUCCESS - Status: ${response.status}, ID: ${data.id}`)
    } catch (error) {
      console.error('Test error:', error)
      setTestResult(`❌ /complaints/submit FAILED - ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testComplaintsMy = async () => {
    setTesting(true)
    setTestResult('Testing /complaints/my...')
    
    try {
      const token = localStorage.getItem('token')
      console.log('🔍 Testing /complaints/my with token:', token)
      
      const response = await fetch('http://localhost:8080/complaints/my', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      setTestResult(`✅ /complaints/my SUCCESS - Status: ${response.status}, Count: ${data.length}`)
    } catch (error) {
      console.error('Test error:', error)
      setTestResult(`❌ /complaints/my FAILED - ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testLogin = async () => {
    setTesting(true)
    setTestResult('Testing login...')
    
    try {
      // Replace with your test credentials
      const result = await login('test@example.com', 'password123')
      
      if (result.success) {
        setTestResult(`✅ Login SUCCESS - User: ${result.user?.email}`)
      } else {
        setTestResult(`❌ Login FAILED - ${result.message}`)
      }
    } catch (error) {
      console.error('Login test error:', error)
      setTestResult(`❌ Login ERROR - ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const clearStorage = () => {
    localStorage.clear()
    window.location.reload()
  }

  const inspectToken = () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          console.log('🔍 Token Payload:', payload)
          alert(`Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`)
        }
      } catch (e) {
        console.error('Token parse error:', e)
      }
    } else {
      alert('No token found in localStorage')
    }
  }

  return (
    <div className="card mt-4">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">Authentication Test Panel</h5>
      </div>
      <div className="card-body">
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="alert alert-light">
              <h6>Current Status</h6>
              <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
              <p><strong>Token:</strong> {localStorage.getItem('token') ? '✓ Present' : '✗ Missing'}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="alert" style={{ backgroundColor: testResult.includes('✅') ? '#d4edda' : testResult.includes('❌') ? '#f8d7da' : '#fff3cd' }}>
              <h6>Test Result</h6>
              <p>{testResult || 'No test run yet'}</p>
              {testing && (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Testing...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12 mb-3">
            <h6>Test Actions</h6>
            <div className="d-flex flex-wrap gap-2">
              <button 
                onClick={testAuthMe} 
                className="btn btn-primary btn-sm"
                disabled={testing || !localStorage.getItem('token')}
              >
                Test /auth/me
              </button>
              
              <button 
                onClick={testComplaintsSubmit} 
                className="btn btn-success btn-sm"
                disabled={testing || !localStorage.getItem('token')}
              >
                Test /complaints/submit
              </button>
              
              <button 
                onClick={testComplaintsMy} 
                className="btn btn-warning btn-sm"
                disabled={testing || !localStorage.getItem('token')}
              >
                Test /complaints/my
              </button>
              
              <button 
                onClick={testLogin} 
                className="btn btn-info btn-sm"
                disabled={testing}
              >
                Test Login
              </button>
              
              <button 
                onClick={inspectToken} 
                className="btn btn-secondary btn-sm"
                disabled={testing || !localStorage.getItem('token')}
              >
                Inspect Token
              </button>
              
              <button 
                onClick={clearStorage} 
                className="btn btn-danger btn-sm"
                disabled={testing}
              >
                Clear Storage
              </button>
              
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-outline-secondary btn-sm"
                disabled={testing}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <h6>Debug Info</h6>
            <div className="alert alert-dark">
              <small>
                <pre className="mb-0">
                  {JSON.stringify({
                    timestamp: new Date().toISOString(),
                    user: user,
                    tokenPresent: !!localStorage.getItem('token'),
                    tokenLength: localStorage.getItem('token')?.length || 0,
                    localStorageKeys: Object.keys(localStorage)
                  }, null, 2)}
                </pre>
              </small>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <h6>Quick Manual Test</h6>
            <div className="input-group mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Paste your JWT token here" 
                id="manualToken"
              />
              <button 
                className="btn btn-outline-primary" 
                type="button"
                onClick={() => {
                  const token = document.getElementById('manualToken').value
                  if (token) {
                    localStorage.setItem('token', token)
                    alert('Token saved. Reloading...')
                    window.location.reload()
                  }
                }}
              >
                Set Token
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="card-footer text-muted">
        <small>
          Open browser console (F12) to see detailed logs. Check Network tab for request/response details.
        </small>
      </div>
    </div>
  )
}

export default TestAuth