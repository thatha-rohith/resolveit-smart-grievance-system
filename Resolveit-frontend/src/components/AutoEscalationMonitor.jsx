import { useState, useEffect } from 'react'
import { escalationAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { 
  FaClock, 
  FaExclamationTriangle, 
  FaBell, 
  FaArrowUp, 
  FaEye, 
  FaSync,
  FaTimes,
  FaUserShield
} from 'react-icons/fa'
import { Link } from 'react-router-dom'

const AutoEscalationMonitor = () => {
  const [complaintsNeedingEscalation, setComplaintsNeedingEscalation] = useState([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(true)
  const [error, setError] = useState('')
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Only check if user is admin and authenticated
    if (isAuthenticated && user && user.role === 'ADMIN') {
      checkEscalations()
      // Check every 5 minutes
      const interval = setInterval(checkEscalations, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user, isAuthenticated])

  const checkEscalations = async () => {
    // Only admins can check escalations
    if (!user || user.role !== 'ADMIN') {
      console.log('⚠️ Skipping escalation check - user is not admin')
      setComplaintsNeedingEscalation([])
      return
    }
    
    try {
      setLoading(true)
      setError('')
      console.log('📊 Checking complaints needing escalation...')
      
      const response = await escalationAPI.getComplaintsRequiringEscalation()
      console.log('📊 Complaints needing escalation:', response)
      
      if (response.success) {
        setComplaintsNeedingEscalation(response.data || [])
      } else {
        setComplaintsNeedingEscalation([])
        setError(response.error || 'Failed to load escalation data')
      }
    } catch (err) {
      console.error('❌ Failed to check escalations:', err)
      // Don't show error for 403 - that's expected for non-admins
      if (err.status !== 403) {
        setError('Failed to check for escalations. Please try again.')
      }
      setComplaintsNeedingEscalation([])
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = () => {
    setVisible(false)
  }

  const showAlertAgain = () => {
    setVisible(true)
    checkEscalations()
  }

  // Only show for admins and if there are complaints
  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return null
  }

  if (!visible) {
    return (
      <div className="alert alert-secondary alert-dismissible fade show mb-4 shadow-sm" role="alert">
        <div className="d-flex align-items-center">
          <FaBell className="me-3 fs-4 text-secondary" />
          <div className="flex-grow-1">
            <p className="mb-0">
              <strong>Escalation Monitor</strong> is hidden. 
              <button 
                className="btn btn-link btn-sm p-0 ms-2"
                onClick={showAlertAgain}
              >
                Show again
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (complaintsNeedingEscalation.length === 0 && !error) {
    return (
      <div className="alert alert-success alert-dismissible fade show mb-4 shadow-sm" role="alert">
        <div className="d-flex align-items-center">
          <FaBell className="me-3 fs-4 text-success" />
          <div className="flex-grow-1">
            <h6 className="alert-heading mb-1">
              <FaUserShield className="me-2" />
              Escalation Status: All Good!
            </h6>
            <p className="mb-0 small">
              No complaints currently require escalation. System is running smoothly.
            </p>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={dismissAlert}
            aria-label="Close"
          ></button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger alert-dismissible fade show mb-4 shadow-sm" role="alert">
        <div className="d-flex align-items-center">
          <FaExclamationTriangle className="me-3 fs-4" />
          <div className="flex-grow-1">
            <h6 className="alert-heading mb-1">
              <FaUserShield className="me-2" />
              Escalation Monitor Error
            </h6>
            <p className="mb-2 small">{error}</p>
            <button 
              className="btn btn-sm btn-outline-danger mt-1"
              onClick={checkEscalations}
              disabled={loading}
            >
              <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
              Retry
            </button>
          </div>
          <button 
            type="button" 
            className="btn-close" 
            onClick={dismissAlert}
            aria-label="Close"
          ></button>
        </div>
      </div>
    )
  }

  return (
    <div className="alert alert-warning alert-dismissible fade show mb-4 shadow-sm" role="alert">
      <div className="d-flex align-items-center">
        <FaBell className="me-3 fs-4 text-warning" />
        <div className="flex-grow-1">
          <h5 className="alert-heading mb-1">
            <FaExclamationTriangle className="me-2" />
            ⚠️ Auto-escalation Required
          </h5>
          <p className="mb-2">
            {complaintsNeedingEscalation.length} complaint(s) have been under review 
            for more than 7 days and need escalation.
          </p>
          
          {complaintsNeedingEscalation.length > 0 && (
            <div className="mt-3">
              <small className="text-muted d-block mb-2">Complaints needing attention:</small>
              <div className="complaints-list">
                {complaintsNeedingEscalation.slice(0, 3).map(complaint => (
                  <div key={complaint.id} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                    <FaClock className="me-2 text-muted" size="12" />
                    <div className="flex-grow-1">
                      <span className="me-3">
                        <strong>#{complaint.id}</strong>: {complaint.title}
                      </span>
                      <small className="text-muted d-block mt-1">
                        Days overdue: {complaint.daysSinceCreation ? complaint.daysSinceCreation - 7 : 'N/A'}
                      </small>
                    </div>
                    <Link 
                      to={`/complaints/${complaint.id}`}
                      className="btn btn-sm btn-outline-warning ms-2"
                      title="View complaint details"
                    >
                      <FaEye size="12" className="me-1" />
                      View
                    </Link>
                    <Link 
                      to={`/admin/complaints?escalate=${complaint.id}`}
                      className="btn btn-sm btn-warning ms-2"
                      title="Escalate this complaint"
                    >
                      <FaArrowUp size="12" className="me-1" />
                      Escalate
                    </Link>
                  </div>
                ))}
                {complaintsNeedingEscalation.length > 3 && (
                  <div className="text-muted small mt-2">
                    + {complaintsNeedingEscalation.length - 3} more complaints
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button 
              className="btn btn-warning btn-sm" 
              onClick={checkEscalations}
              disabled={loading}
            >
              <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
              {loading ? 'Checking...' : 'Check Again'}
            </button>
            
            <Link 
              to="/admin/complaints" 
              className="btn btn-outline-warning btn-sm"
            >
              <FaArrowUp className="me-1" />
              Manage All Complaints
            </Link>
            
            <Link 
              to="/admin/senior-requests" 
              className="btn btn-outline-info btn-sm"
            >
              <FaUserShield className="me-1" />
              View Senior Employees
            </Link>
            
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={dismissAlert}
            >
              <FaTimes className="me-1" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AutoEscalationMonitor