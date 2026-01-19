import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { employeeRequestAPI } from '../services/api'
import { 
  FaUserCheck, 
  FaUserClock, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaArrowLeft, 
  FaSync, 
  FaBriefcase, 
  FaShieldAlt, 
  FaHome, 
  FaClock, 
  FaEnvelope, 
  FaInfoCircle, 
  FaQuestionCircle, 
  FaExclamationTriangle, 
  FaPaperPlane, 
  FaIdCard, 
  FaHourglass 
} from 'react-icons/fa'
import './RequestEmployee.css';

const RequestEmployee = () => {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [requestStatus, setRequestStatus] = useState(null)
  const [requestData, setRequestData] = useState(null)
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      checkRequestStatus()
    }
  }, [isAuthenticated])

  const checkRequestStatus = async () => {
    try {
      setStatusLoading(true)
      const data = await employeeRequestAPI.getRequestStatus()
      
      console.log('📊 Request status response:', data)
      
      if (data.success) {
        setRequestStatus(data.status)
        setRequestData(data)
        
        // Handle different statuses
        if (data.status === 'ALREADY_ADMIN') {
          setError('You are already an admin')
        } else if (data.status === 'ALREADY_EMPLOYEE') {
          setError('You are already an employee')
        } else if (data.status === 'REJECTED') {
          setError('') // Clear error for rejected status
        } else if (data.status === 'NO_REQUEST') {
          setError('') // Clear error for no request
        }
      } else {
        setError(data.error || 'Failed to check request status')
      }
    } catch (err) {
      console.error('❌ Error checking request status:', err)
      if (err.status === 401 || err.status === 403) {
        setError('Session expired. Please login again.')
        logout()
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError('Failed to check request status. Please try again.')
      }
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason')
      return
    }
    
    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('📤 Submitting request with reason:', reason)
      const data = await employeeRequestAPI.submitRequest(reason)
      
      console.log('✅ Submit response:', data)
      
      if (data.success) {
        setSuccess('✅ Employee request submitted successfully! Waiting for admin approval.')
        setReason('')
        setRequestStatus('PENDING')
        setRequestData({
          id: data.requestId,
          requestedAt: data.requestedAt,
          reason: data.reason || reason
        })
        
        // Refresh the status after a short delay
        setTimeout(() => {
          checkRequestStatus()
        }, 1000)
      } else {
        setError(data.error || 'Failed to submit request')
      }
    } catch (err) {
      console.error('❌ Error submitting request:', err)
      
      // Extract error message
      let errorMessage = 'Failed to submit request. Please try again.'
      
      if (err.data) {
        if (err.data.error) {
          errorMessage = err.data.error
        } else if (err.data.message) {
          errorMessage = err.data.message
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      
      // If it's a database/constraint error, suggest refreshing
      if (errorMessage.includes('Database') || errorMessage.includes('constraint')) {
        setTimeout(() => {
          checkRequestStatus()
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNewRequestAfterRejection = () => {
    // Clear form and show form for new request
    setReason('')
    setError('')
    setSuccess('')
    setRequestStatus('NO_REQUEST') // Force show form
    setRequestData(null)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Loading state
  if (statusLoading && !requestStatus) {
    return (
      <div className="request-employee-container">
        <div className="loading-card">
          <div className="spinner-container">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Checking your request status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="request-employee-container">
        <div className="alert-card warning">
          <FaExclamationTriangle className="alert-icon" />
          <h4>Please login to request employee access</h4>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (user.role === 'EMPLOYEE' || user.role === 'ADMIN') {
    return (
      <div className="request-employee-container">
        <div className="success-card">
          <div className="card-header">
            <FaUserCheck className="header-icon" />
            <h2>Already Have Access</h2>
          </div>
          <div className="card-body">
            <div className="success-icon">
              {user.role === 'EMPLOYEE' ? <FaBriefcase /> : <FaShieldAlt />}
            </div>
            <h3>You're already an {user.role.toLowerCase()}!</h3>
            <p className="description">
              You already have {user.role.toLowerCase()} access privileges.
              {user.role === 'EMPLOYEE' && ' Visit your employee dashboard to manage complaints.'}
              {user.role === 'ADMIN' && ' Visit your admin dashboard to manage the system.'}
            </p>
            <div className="action-buttons">
              {user.role === 'EMPLOYEE' && (
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/employee/dashboard')}>
                  <FaBriefcase className="me-2" />
                  Go to Employee Dashboard
                </button>
              )}
              {user.role === 'ADMIN' && (
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/admin/dashboard')}>
                  <FaShieldAlt className="me-2" />
                  Go to Admin Dashboard
                </button>
              )}
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/public-complaints')}>
                <FaHome className="me-2" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (requestStatus === 'PENDING') {
    return (
      <div className="request-employee-container">
        <div className="pending-card">
          <div className="card-header">
            <FaClock className="header-icon" />
            <h2>Request Pending Review</h2>
          </div>
          <div className="card-body">
            <div className="status-icon pending">
              <FaHourglass />
            </div>
            <h3>Your request is under review</h3>
            <p className="description">
              Your employee access request has been submitted and is waiting for admin approval.
              You will be notified once it's reviewed.
            </p>
            
            {requestData && (
              <div className="request-details">
                <h5>Request Details:</h5>
                <div className="details-grid">
                  <div className="detail-item">
                    <FaIdCard className="me-2" />
                    <span>Request ID:</span>
                    <strong>#{requestData.requestId || requestData.id}</strong>
                  </div>
                  <div className="detail-item">
                    <FaClock className="me-2" />
                    <span>Submitted:</span>
                    <strong>{formatDate(requestData.requestedAt)}</strong>
                  </div>
                  <div className="detail-item full-width">
                    <FaInfoCircle className="me-2" />
                    <span>Reason:</span>
                    <p>{requestData.reason || 'No reason provided'}</p>
                  </div>
                  <div className="detail-item">
                    <span>Status:</span>
                    <span className="status-badge pending">PENDING</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="action-buttons">
              <button className="btn btn-outline" onClick={() => navigate('/public-complaints')}>
                <FaArrowLeft className="me-2" />
                Back to Home
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={checkRequestStatus}
                disabled={statusLoading}
              >
                {statusLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Checking...
                  </>
                ) : (
                  <>
                    <FaSync className="me-2" />
                    Check Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (requestStatus === 'APPROVED') {
    return (
      <div className="request-employee-container">
        <div className="approved-card">
          <div className="card-header">
            <FaCheckCircle className="header-icon" />
            <h2>Request Approved!</h2>
          </div>
          <div className="card-body">
            <div className="status-icon approved">
              <FaUserCheck />
            </div>
            <h3>Welcome to the Team!</h3>
            <p className="description">
              Your employee access request has been approved.
              You now have employee privileges.
            </p>
            
            {requestData && (
              <div className="approval-details">
                <div className="detail-item">
                  <FaCheckCircle className="me-2" />
                  <span>Approved on:</span>
                  <strong>{formatDate(requestData.reviewedAt)}</strong>
                </div>
                {requestData.adminNotes && (
                  <div className="detail-item">
                    <FaInfoCircle className="me-2" />
                    <span>Admin Notes:</span>
                    <p>{requestData.adminNotes}</p>
                  </div>
                )}
              </div>
            )}
            
            <button className="btn btn-success btn-lg" onClick={() => {
              // Force page reload to update user role
              window.location.href = '/employee/dashboard'
            }}>
              <FaBriefcase className="me-2" />
              Go to Employee Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show form for:
  // 1. Users with NO_REQUEST status
  // 2. Users with REJECTED status (they can submit new request)
  const showForm = !requestStatus || requestStatus === 'NO_REQUEST' || requestStatus === 'REJECTED'

  return (
    <div className="request-employee-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8 col-lg-10">
            {/* Main Request Card */}
            <div className="request-card">
              <div className="card-header">
                <FaUserClock className="header-icon" />
                <div>
                  <h2>Request Employee Access</h2>
                  <p className="subtitle">Join our team to help manage community complaints</p>
                </div>
              </div>

              <div className="card-body">
                {/* Show previous rejection details if any */}
                {requestStatus === 'REJECTED' && requestData && (
                  <div className="alert-card warning mb-4">
                    <FaExclamationTriangle className="alert-icon" />
                    <div className="flex-grow-1">
                      <h5 className="mb-2">Previous Request Rejected</h5>
                      {requestData.adminNotes && (
                        <p className="mb-2"><strong>Admin Feedback:</strong> {requestData.adminNotes}</p>
                      )}
                      {requestData.reviewedAt && (
                        <p className="mb-0"><small>Reviewed on: {formatDate(requestData.reviewedAt)}</small></p>
                      )}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {error && !error.includes('already') && (
                  <div className="alert-card error">
                    <FaExclamationTriangle className="alert-icon" />
                    <div className="flex-grow-1">
                      {error}
                      {error.includes('Database') && (
                        <div className="mt-2">
                          <small>This might be a temporary issue. Please try refreshing the page.</small>
                        </div>
                      )}
                    </div>
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}
                
                {success && (
                  <div className="alert-card success">
                    <FaCheckCircle className="alert-icon" />
                    <div className="flex-grow-1">{success}</div>
                    <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                  </div>
                )}

                {/* Benefits Info */}
                <div className="benefits-section">
                  <h4><FaInfoCircle className="me-2" />About Employee Access</h4>
                  <p className="mb-3"><strong>As an employee, you will gain access to:</strong></p>
                  <div className="benefits-grid">
                    <div className="benefit-item">
                      <FaCheckCircle className="benefit-icon" />
                      <span>Employee dashboard</span>
                    </div>
                    <div className="benefit-item">
                      <FaCheckCircle className="benefit-icon" />
                      <span>View assigned complaints</span>
                    </div>
                    <div className="benefit-item">
                      <FaCheckCircle className="benefit-icon" />
                      <span>Update complaint status</span>
                    </div>
                    <div className="benefit-item">
                      <FaCheckCircle className="benefit-icon" />
                      <span>Add internal comments</span>
                    </div>
                    <div className="benefit-item">
                      <FaCheckCircle className="benefit-icon" />
                      <span>Manage complaint timelines</span>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                {showForm && (
                  <form onSubmit={handleSubmit} className="request-form">
                    <div className="form-section">
                      <label htmlFor="reason" className="form-label">
                        Why do you want to become an employee? *
                        {requestStatus === 'REJECTED' && (
                          <span className="text-warning ms-2">(New request after rejection)</span>
                        )}
                      </label>
                      <textarea
                        className="form-control"
                        id="reason"
                        rows="5"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please explain why you want employee access, your relevant experience or skills, and how you can contribute..."
                        required
                        minLength="10"
                        maxLength="1000"
                      />
                      <div className="char-count">
                        <span className={reason.length > 1000 ? 'text-danger' : 'text-muted'}>
                          {reason.length}/1000 characters
                        </span>
                        <small className="text-muted">Minimum 10 characters</small>
                      </div>
                    </div>

                    <div className="note-section">
                      <FaExclamationTriangle className="note-icon" />
                      <div>
                        <strong>Note:</strong> Your request will be reviewed by administrators. 
                        This process may take 1-3 business days. You'll receive a notification when reviewed.
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="button" className="btn btn-outline" onClick={() => navigate('/my-complaints')}>
                        <FaArrowLeft className="me-2" />
                        Back to My Complaints
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading || !reason.trim() || reason.length < 10}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FaPaperPlane className="me-2" />
                            {requestStatus === 'REJECTED' ? 'Submit New Request' : 'Submit Request'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Debug info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-light border rounded">
                    <small className="text-muted">
                      <strong>Debug Info:</strong> Status: {requestStatus || 'null'}, 
                      User ID: {user?.id}, 
                      Role: {user?.role}
                    </small>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <div className="footer-info">
                  <div className="user-info">
                    <FaEnvelope className="me-2" />
                    <strong>User:</strong> {user.email}
                  </div>
                  <div className="user-info">
                    <FaIdCard className="me-2" />
                    <strong>Role:</strong> {user.role}
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="faq-card">
              <div className="card-header">
                <FaQuestionCircle className="header-icon" />
                <h5>Frequently Asked Questions</h5>
              </div>
              <div className="card-body">
                <div className="faq-item">
                  <div className="faq-question">What happens after I submit my request?</div>
                  <div className="faq-answer">
                    Your request will be queued for review by administrators. You can check the status anytime on this page.
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">Can I submit multiple requests?</div>
                  <div className="faq-answer">
                    You can only have one pending request at a time. If rejected, you can submit a new one.
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">What if my request is rejected?</div>
                  <div className="faq-answer">
                    You'll receive feedback from the administrator. You can then submit a new request addressing the feedback.
                  </div>
                </div>
                <div className="faq-item">
                  <div className="faq-question">How long does approval take?</div>
                  <div className="faq-answer">
                    Typically 1-3 business days. Administrators review requests during working hours.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequestEmployee