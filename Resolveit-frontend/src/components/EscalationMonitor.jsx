import { useState, useEffect } from 'react'
import { escalationAPI } from '../services/api'
import { FaExclamationTriangle, FaSync, FaClock, FaUser, FaArrowUp } from 'react-icons/fa'

const EscalationMonitor = () => {
  const [needsEscalation, setNeedsEscalation] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  const fetchEscalationStatus = async () => {
    try {
      setLoading(true)
      const response = await escalationAPI.getComplaintsRequiringEscalation()
      
      if (response.success) {
        setNeedsEscalation(response.complaints || [])
        
        // Calculate stats
        const stats = {
          total: response.count || 0,
          unassigned: (response.complaints || []).filter(c => !c.assignedTo || c.assignedTo === 'Unassigned').length,
          assigned: (response.complaints || []).filter(c => c.assignedTo && c.assignedTo !== 'Unassigned').length,
          overdue: (response.complaints || []).filter(c => c.daysOpen >= 7).length
        }
        setStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch escalation status:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerEscalation = async () => {
    if (!window.confirm('Trigger auto-escalation now?')) return
    
    try {
      setLoading(true)
      const response = await escalationAPI.triggerAutoEscalation()
      
      if (response.success) {
        alert('Auto-escalation triggered successfully!')
        fetchEscalationStatus()
      }
    } catch (error) {
      alert('Failed to trigger escalation: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEscalationStatus()
    // Check every 5 minutes
    const interval = setInterval(fetchEscalationStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (needsEscalation.length === 0) {
    return null
  }

  return (
    <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
      <div className="d-flex align-items-center">
        <FaExclamationTriangle className="me-3 fs-4" />
        <div className="flex-grow-1">
          <h5 className="alert-heading mb-2">
            ⚠️ Complaints Requiring Escalation
          </h5>
          <div className="row mb-3">
            <div className="col-3">
              <div className="text-center">
                <div className="h4 mb-0">{stats?.total || 0}</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
            <div className="col-3">
              <div className="text-center">
                <div className="h4 mb-0">{stats?.unassigned || 0}</div>
                <small className="text-muted">Unassigned</small>
              </div>
            </div>
            <div className="col-3">
              <div className="text-center">
                <div className="h4 mb-0">{stats?.assigned || 0}</div>
                <small className="text-muted">Assigned</small>
              </div>
            </div>
            <div className="col-3">
              <div className="text-center">
                <div className="h4 mb-0">{stats?.overdue || 0}</div>
                <small className="text-muted">Overdue</small>
              </div>
            </div>
          </div>
          
          <div className="complaints-list mb-3">
            {needsEscalation.slice(0, 3).map(complaint => (
              <div key={complaint.id} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                <div className="me-3">
                  <span className="badge bg-secondary">#{complaint.id}</span>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold">{complaint.title}</div>
                  <div className="small text-muted">
                    <FaClock className="me-1" />
                    {complaint.daysOpen} days open • 
                    <FaUser className="ms-2 me-1" />
                    {complaint.assignedTo || 'Unassigned'}
                  </div>
                </div>
              </div>
            ))}
            {needsEscalation.length > 3 && (
              <div className="text-muted small">
                + {needsEscalation.length - 3} more complaints
              </div>
            )}
          </div>
          
          <div className="d-flex gap-2">
            <button 
              className="btn btn-warning btn-sm"
              onClick={triggerEscalation}
              disabled={loading}
            >
              <FaArrowUp className="me-1" />
              {loading ? 'Processing...' : 'Trigger Escalation'}
            </button>
            <button 
              className="btn btn-outline-warning btn-sm"
              onClick={fetchEscalationStatus}
              disabled={loading}
            >
              <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EscalationMonitor