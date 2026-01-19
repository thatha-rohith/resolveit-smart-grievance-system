import { useState, useEffect } from 'react'
import { escalationAPI, userAPI } from '../services/api'
import { FaArrowUp, FaUserTie, FaInfoCircle, FaClock, FaExclamationTriangle, FaSpinner } from 'react-icons/fa'

const EscalateComplaint = ({ complaintId, onEscalated, currentComplaint }) => {
  const [seniorEmployees, setSeniorEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSeniorEmployees()
  }, [])

  const fetchSeniorEmployees = async () => {
    try {
      console.log('👥 Fetching senior employees...')
      const response = await userAPI.getSeniorEmployees()
      console.log('✅ Senior employees:', response)
      
      if (response.success) {
        setSeniorEmployees(response.data || [])
      } else {
        setError('Failed to load senior employees')
        setSeniorEmployees([])
      }
    } catch (err) {
      console.error('❌ Error fetching senior employees:', err)
      setError('Failed to load senior employees. Please try again.')
      setSeniorEmployees([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedEmployee) {
      setError('Please select a senior employee')
      return
    }

    if (!reason.trim()) {
      setError('Please provide an escalation reason')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      console.log('📤 Escalating complaint:', complaintId, {
        seniorEmployeeId: selectedEmployee,
        reason: reason.trim()
      })

      const response = await escalationAPI.escalateComplaint(complaintId, {
        seniorEmployeeId: selectedEmployee,
        reason: reason.trim()
      })

      console.log('✅ Escalation response:', response)

      if (response.success) {
        setSuccess('✅ Complaint escalated successfully!')
        setReason('')
        setSelectedEmployee('')
        
        // Callback to refresh complaint data
        if (onEscalated) {
          setTimeout(() => {
            onEscalated()
          }, 1500)
        }
      } else {
        throw new Error(response.error || 'Failed to escalate complaint')
      }
    } catch (err) {
      console.error('❌ Escalation error:', err)
      setError(err.message || 'Failed to escalate complaint. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card border-warning shadow-sm">
      <div className="card-header bg-warning text-dark">
        <h5 className="mb-0">
          <FaArrowUp className="me-2" />
          Escalate Complaint
        </h5>
      </div>
      
      <div className="card-body">
        {currentComplaint && currentComplaint.escalatedTo && (
          <div className="alert alert-info mb-3">
            <FaInfoCircle className="me-2" />
            <div>
              <strong>Already escalated to:</strong> {currentComplaint.escalatedToName}
              {currentComplaint.escalationReason && (
                <div className="mt-1">
                  <strong>Reason:</strong> {currentComplaint.escalationReason}
                </div>
              )}
              {currentComplaint.escalationDate && (
                <div className="mt-1">
                  <FaClock className="me-1" />
                  <small>Escalated on: {new Date(currentComplaint.escalationDate).toLocaleString()}</small>
                </div>
              )}
            </div>
          </div>
        )}

        {currentComplaint && currentComplaint.daysSinceCreation >= 7 && (
          <div className="alert alert-danger mb-3">
            <FaExclamationTriangle className="me-2" />
            <div>
              <strong>⚠️ Auto-escalation Required</strong>
              <div className="small mt-1">
                This complaint has been open for {currentComplaint.daysSinceCreation} days.
                Please escalate to ensure timely resolution.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <FaExclamationTriangle className="me-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <FaInfoCircle className="me-2" />
            {success}
          </div>
        )}

        {!currentComplaint?.escalatedTo && (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                <FaUserTie className="me-2" />
                Select Senior Employee *
              </label>
              <select
                className="form-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
                disabled={loading || seniorEmployees.length === 0}
              >
                <option value="">Choose a senior employee...</option>
                {seniorEmployees.length > 0 ? (
                  seniorEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.email})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading senior employees...</option>
                )}
              </select>
              {seniorEmployees.length === 0 && !loading && (
                <small className="text-danger">
                  No senior employees available. Please contact administrator.
                </small>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Escalation Reason *</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Explain why this complaint needs escalation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                disabled={loading}
                maxLength="500"
              />
              <div className="d-flex justify-content-between mt-1">
                <small className="text-muted">
                  This reason will be visible to the senior employee
                </small>
                <small className={reason.length > 450 ? 'text-danger' : 'text-muted'}>
                  {reason.length}/500 characters
                </small>
              </div>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn btn-warning"
                disabled={loading || !selectedEmployee || !reason.trim() || seniorEmployees.length === 0}
              >
                {loading ? (
                  <>
                    <FaSpinner className="me-2 fa-spin" />
                    Escalating...
                  </>
                ) : (
                  <>
                    <FaArrowUp className="me-2" />
                    Escalate Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="alert alert-info mt-3">
          <small>
            <FaInfoCircle className="me-2" />
            <strong>Note:</strong> Escalated complaints will be assigned to senior employees 
            for priority handling. This action should be used for complaints that require 
            specialized attention or have been unresolved for an extended period.
          </small>
        </div>
      </div>
    </div>
  )
}

export default EscalateComplaint