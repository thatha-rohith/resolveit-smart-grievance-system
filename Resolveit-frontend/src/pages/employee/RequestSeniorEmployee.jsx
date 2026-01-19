import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { seniorRequestAPI } from '../../services/api'
import { 
  FaUserGraduate, FaPaperPlane, FaCheckCircle, 
  FaClock, FaArrowUp, FaInfoCircle, FaShieldAlt,
  FaHistory, FaTimes, FaUserCheck, FaExclamationTriangle,
  FaChartLine, FaChartBar, FaList, FaSpinner,
  FaFileAlt, FaUserTie, FaAward, FaLock
} from 'react-icons/fa'

const RequestSeniorEmployee = () => {
  const [formData, setFormData] = useState({
    reason: '',
    qualifications: '',
    experience: '',
    additionalInfo: ''
  })
  const [existingRequest, setExistingRequest] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check eligibility
      const eligibilityRes = await seniorRequestAPI.checkEligibility()
      console.log('✅ Eligibility response:', eligibilityRes)
      
      if (eligibilityRes && eligibilityRes.success) {
        // Handle both response formats
        if (eligibilityRes.details) {
          setEligibility(eligibilityRes.details)
        } else {
          setEligibility(eligibilityRes)
        }
      } else if (eligibilityRes) {
        // If no success property, use the response directly
        setEligibility(eligibilityRes)
      }
      
      // Check existing request
      const requestRes = await seniorRequestAPI.getMyRequest()
      console.log('✅ Existing request response:', requestRes)
      
      if (requestRes && requestRes.success && requestRes.data) {
        setExistingRequest(requestRes.data)
      } else if (requestRes && requestRes.data) {
        // Handle direct data response
        setExistingRequest(requestRes.data)
      }
    } catch (err) {
      console.error('❌ Error fetching data:', err)
      if (err.response?.status === 401) {
        setError('Please login to continue')
      } else {
        setError('Failed to load data. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.reason.trim()) {
      setError('Please provide a reason for requesting senior position')
      return false
    }
    if (formData.reason.trim().length < 10) {
      setError('Reason should be at least 10 characters')
      return false
    }
    if (!formData.qualifications.trim()) {
      setError('Please mention your qualifications')
      return false
    }
    if (!formData.experience.trim()) {
      setError('Please describe your experience')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user || user.role !== 'EMPLOYEE') {
      setError('Only employees can request senior position')
      return
    }

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await seniorRequestAPI.submitRequest(formData)
      console.log('✅ Submit response:', response)
      
      if (response && response.success) {
        setSuccess(response.message || 'Senior request submitted successfully!')
        
        if (response.data) {
          setExistingRequest(response.data)
        }
        
        // Clear form
        setFormData({
          reason: '',
          qualifications: '',
          experience: '',
          additionalInfo: ''
        })
        
        // Refresh data
        fetchData()
      } else {
        setError(response?.error || response?.message || 'Failed to submit request')
      }
      
    } catch (err) {
      console.error('❌ Submit error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!existingRequest || !existingRequest.id) {
      setError('No request to cancel')
      return
    }
    
    if (!window.confirm('Are you sure you want to cancel your senior request?')) return
    
    try {
      const response = await seniorRequestAPI.cancelRequest(existingRequest.id)
      console.log('✅ Cancel response:', response)
      
      if (response && response.success) {
        setExistingRequest(null)
        setSuccess('Request cancelled successfully!')
        fetchData()
      } else {
        setError('Failed to cancel request. Please try again.')
      }
    } catch (err) {
      console.error('❌ Cancel error:', err)
      setError('Failed to cancel request. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Loading senior request data...</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container">
        <div className="alert alert-danger mt-4">
          <FaExclamationTriangle className="me-2" />
          Please login to access this page
        </div>
        <Link to="/login" className="btn btn-primary mt-3">
          Go to Login
        </Link>
      </div>
    )
  }

  if (user.role !== 'EMPLOYEE') {
    return (
      <div className="container">
        <div className="alert alert-warning mt-4">
          <FaLock className="me-2" />
          Only employees can request senior position. Your role is: <strong>{user.role}</strong>
        </div>
        <Link to="/" className="btn btn-primary mt-3">
          Go to Home
        </Link>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING': return { class: 'badge bg-warning', icon: <FaClock />, label: 'Pending Review' }
      case 'APPROVED': return { class: 'badge bg-success', icon: <FaCheckCircle />, label: 'Approved' }
      case 'REJECTED': return { class: 'badge bg-danger', icon: <FaTimes />, label: 'Rejected' }
      default: return { class: 'badge bg-secondary', icon: null, label: status }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Invalid date'
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-2">
            <FaArrowUp className="me-2 text-warning" />
            Request Senior Employee Position
          </h1>
          <p className="text-muted">Apply for a senior employee role to handle escalated complaints</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/employee/dashboard" className="btn btn-outline-secondary">
            <FaArrowUp className="me-2" />
            Back to Dashboard
          </Link>
          <button 
            className="btn btn-outline-primary"
            onClick={fetchData}
            disabled={loading}
          >
            <FaSpinner className={`me-2 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show mb-4">
          <FaCheckCircle className="me-2" />
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Eligibility Card */}
      {eligibility && (
        <div className="card mb-4 border-info shadow-sm">
          <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaChartLine className="me-2" />
              Eligibility Status
            </h5>
            <span className={`badge ${eligibility.eligible ? 'bg-success' : 'bg-danger'} fs-6`}>
              {eligibility.eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}
            </span>
          </div>
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-3">
                  <div className="me-3">
                    {eligibility.eligible ? (
                      <FaCheckCircle className="text-success fa-2x" />
                    ) : (
                      <FaExclamationTriangle className="text-danger fa-2x" />
                    )}
                  </div>
                  <div>
                    <h6 className="mb-1">
                      {eligibility.eligible ? 'Ready to Apply' : 'Requirements Not Met'}
                    </h6>
                    <p className="text-muted mb-0 small">
                      {eligibility.message || eligibility.details?.message || 
                       (eligibility.eligible ? 'You meet all requirements for senior position' : 'Some requirements are not met')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h6>Requirements Checklist:</h6>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Minimum 4 assigned complaints
                      <span className={`badge ${eligibility.hasEnoughComplaints ? 'bg-success' : 'bg-danger'}`}>
                        {eligibility.totalComplaints || 0}/{eligibility.minComplaintsRequired || 4}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      Minimum 80% resolution rate
                      <span className={`badge ${eligibility.hasGoodResolutionRate ? 'bg-success' : 'bg-danger'}`}>
                        {Math.round(eligibility.resolutionRate || 0)}% / {eligibility.minResolutionRateRequired || 80}%
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="row text-center mb-3">
                  <div className="col-6">
                    <div className="h2 text-primary mb-0">{eligibility.totalComplaints || 0}</div>
                    <small className="text-muted">Total Assigned</small>
                  </div>
                  <div className="col-6">
                    <div className="h2 text-success mb-0">{eligibility.resolvedComplaints || 0}</div>
                    <small className="text-muted">Resolved</small>
                  </div>
                </div>
                
                <div className="progress mb-2" style={{ height: '15px' }}>
                  <div 
                    className="progress-bar bg-success" 
                    role="progressbar" 
                    style={{ width: `${eligibility.resolutionRate || 0}%` }}
                    aria-valuenow={eligibility.resolutionRate || 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {Math.round(eligibility.resolutionRate || 0)}%
                  </div>
                </div>
                <small className="text-muted d-block mb-3">
                  Resolution Rate: {Math.round(eligibility.resolutionRate || 0)}% (Minimum {eligibility.minResolutionRateRequired || 80}% required)
                </small>
                
                <div className="alert alert-light">
                  <FaInfoCircle className="me-2 text-info" />
                  <small>
                    Senior employees can handle escalated complaints, provide guidance to regular employees, 
                    and have access to advanced features.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Request Status */}
      {existingRequest && (
        <div className="card mb-4 border-primary shadow-sm">
          <div className="card-header bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaHistory className="me-2" />
                Your Request Status
              </h5>
              <span className="badge bg-light text-dark">
                Request ID: #{existingRequest.id}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  {(() => {
                    const status = getStatusBadge(existingRequest.status)
                    return (
                      <span className={`badge ${status.class} fs-6 p-2 mb-2 d-inline-flex align-items-center`}>
                        {status.icon} {status.label}
                      </span>
                    )
                  })()}
                </div>
                
                <div className="mb-3">
                  <strong>Submitted:</strong> {formatDate(existingRequest.requestedAt)}
                </div>
                
                {existingRequest.reason && (
                  <div className="mb-2">
                    <strong>Reason for Request:</strong>
                    <p className="text-muted small mb-0 mt-1 p-2 bg-light rounded">
                      {existingRequest.reason}
                    </p>
                  </div>
                )}
                
                {existingRequest.qualifications && (
                  <div className="mb-2">
                    <strong>Qualifications:</strong>
                    <p className="text-muted small mb-0 mt-1 p-2 bg-light rounded">
                      {existingRequest.qualifications}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="col-md-6">
                {existingRequest.status === 'PENDING' ? (
                  <div className="alert alert-warning">
                    <div className="d-flex align-items-center">
                      <FaClock className="me-2 fa-lg" />
                      <div>
                        <strong>Under Review</strong>
                        <p className="mb-0 small">Your request is being reviewed by admin</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={handleCancelRequest}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <FaTimes className="me-2" />
                            Cancel Request
                          </>
                        )}
                      </button>
                      <small className="d-block text-muted mt-2">
                        You can cancel this request anytime before it's reviewed
                      </small>
                    </div>
                  </div>
                ) : existingRequest.status === 'APPROVED' ? (
                  <div className="alert alert-success">
                    <div className="d-flex align-items-center">
                      <FaUserCheck className="me-2 fa-lg" />
                      <div>
                        <strong>Congratulations! 🎉</strong>
                        <p className="mb-0 small">Your request has been approved. You are now a Senior Employee.</p>
                      </div>
                    </div>
                    {existingRequest.adminNotes && (
                      <div className="mt-2">
                        <strong>Admin Notes:</strong>
                        <p className="mb-0 small mt-1 p-2 bg-light rounded">{existingRequest.adminNotes}</p>
                      </div>
                    )}
                    <div className="mt-3">
                      <Link to="/senior/dashboard" className="btn btn-sm btn-success">
                        <FaUserTie className="me-2" />
                        Go to Senior Dashboard
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-danger">
                    <div className="d-flex align-items-center">
                      <FaTimes className="me-2 fa-lg" />
                      <div>
                        <strong>Request Rejected</strong>
                        <p className="mb-0 small">
                          {existingRequest.adminNotes || 'Your request was rejected by admin.'}
                        </p>
                      </div>
                    </div>
                    {existingRequest.reviewedAt && (
                      <small className="text-muted d-block mt-2">
                        Reviewed on: {formatDate(existingRequest.reviewedAt)}
                      </small>
                    )}
                    <div className="mt-3">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={fetchData}
                      >
                        <FaSpinner className="me-2" />
                        Try Again Later
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Form - Only show if eligible and no pending request */}
      {eligibility?.eligible && (!existingRequest || existingRequest.status !== 'PENDING') ? (
        <div className="card shadow">
          <div className="card-header bg-gradient bg-warning text-dark">
            <h5 className="mb-0">
              <FaUserGraduate className="me-2" />
              Senior Position Application Form
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="alert alert-info mb-4">
                <FaInfoCircle className="me-2" />
                <strong>Note:</strong> Please provide detailed information to help admin evaluate your application.
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  <FaFileAlt className="me-2 text-primary" />
                  Why do you want to become a Senior Employee? *
                </label>
                <textarea
                  className="form-control"
                  name="reason"
                  rows="3"
                  value={formData.reason}
                  onChange={handleChange}
                  placeholder="Explain why you're interested in the senior role, what motivates you, and how you can contribute..."
                  required
                  maxLength="1000"
                />
                <small className="text-muted">
                  Please provide a detailed reason (10-1000 characters). 
                  <span className="float-end">{formData.reason.length}/1000</span>
                </small>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  <FaAward className="me-2 text-primary" />
                  Qualifications & Certifications *
                </label>
                <textarea
                  className="form-control"
                  name="qualifications"
                  rows="3"
                  value={formData.qualifications}
                  onChange={handleChange}
                  placeholder="List your relevant qualifications, certifications, education, training programs..."
                  required
                  maxLength="1000"
                />
                <small className="text-muted">
                  List your educational background, certifications, and any special training
                  <span className="float-end">{formData.qualifications.length}/1000</span>
                </small>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  <FaChartBar className="me-2 text-primary" />
                  Relevant Experience *
                </label>
                <textarea
                  className="form-control"
                  name="experience"
                  rows="3"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Describe your experience handling complaints, problem-solving examples, leadership experience..."
                  required
                  maxLength="1000"
                />
                <small className="text-muted">
                  Share specific examples of your work experience and achievements
                  <span className="float-end">{formData.experience.length}/1000</span>
                </small>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold">
                  <FaInfoCircle className="me-2 text-primary" />
                  Additional Information (Optional)
                </label>
                <textarea
                  className="form-control"
                  name="additionalInfo"
                  rows="2"
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  placeholder="Any additional information you'd like to share, such as leadership qualities, special skills, future goals..."
                  maxLength="500"
                />
                <small className="text-muted">
                  Optional: Share anything else that might support your application
                  <span className="float-end">{formData.additionalInfo.length}/500</span>
                </small>
              </div>

              <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={() => navigate('/employee/dashboard')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !eligibility.eligible}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="me-2" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="card-footer bg-light">
            <small className="text-muted">
              <FaShieldAlt className="me-1" />
              Your application will be reviewed by an administrator. You'll be notified once a decision is made.
            </small>
          </div>
        </div>
      ) : eligibility?.eligible === false && (!existingRequest || existingRequest.status !== 'PENDING') ? (
        <div className="alert alert-warning">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2 fa-lg" />
            <div>
              <strong>Not Eligible Yet:</strong> {eligibility.message || 'You do not meet the requirements for senior position'}
              <div className="mt-2">
                <Link to="/employee/dashboard" className="btn btn-sm btn-outline-primary me-2">
                  <FaChartBar className="me-1" />
                  Improve Performance
                </Link>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchData}
                >
                  <FaSpinner className="me-1" />
                  Check Again
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default RequestSeniorEmployee