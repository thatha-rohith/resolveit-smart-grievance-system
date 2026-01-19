import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { employeeRequestAPI } from '../../services/api'

const EmployeeRequests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState({})
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectNotes, setRejectNotes] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📋 Fetching employee requests...')
      const response = await employeeRequestAPI.getAllRequests()
      console.log('✅ Employee requests:', response)
      
      if (response.success) {
        setRequests(response.requests || [])
      } else {
        setError(response.error || 'Failed to load requests')
      }
    } catch (err) {
      console.error('❌ Failed to fetch employee requests:', err)
      setError('Failed to load employee requests. Please try again.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this employee request?')) {
      return
    }
    
    setProcessing(prev => ({ ...prev, [requestId]: true }))
    
    try {
      const response = await employeeRequestAPI.approveRequest(requestId)
      
      if (response.success) {
        alert('✅ Request approved successfully!')
        await fetchRequests() // Refresh the list
      } else {
        alert(`❌ Failed to approve request: ${response.error}`)
      }
    } catch (err) {
      console.error('❌ Failed to approve request:', err)
      alert('❌ Failed to approve request. Please try again.')
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }))
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    
    if (!rejectNotes.trim() && !window.confirm('Reject without providing feedback?')) {
      return
    }
    
    setProcessing(prev => ({ ...prev, [selectedRequest.id]: true }))
    
    try {
      const response = await employeeRequestAPI.rejectRequest(selectedRequest.id, rejectNotes)
      
      if (response.success) {
        alert('❌ Request rejected successfully!')
        setSelectedRequest(null)
        setRejectNotes('')
        await fetchRequests() // Refresh the list
      } else {
        alert(`❌ Failed to reject request: ${response.error}`)
      }
    } catch (err) {
      console.error('❌ Failed to reject request:', err)
      alert('❌ Failed to reject request. Please try again.')
    } finally {
      setProcessing(prev => ({ ...prev, [selectedRequest.id]: false }))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">Loading employee requests...</span>
      </div>
    )
  }

  const pendingRequests = requests.filter(req => req.status === 'PENDING')
  const approvedRequests = requests.filter(req => req.status === 'APPROVED')
  const rejectedRequests = requests.filter(req => req.status === 'REJECTED')

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Employee Requests</h2>
          <p className="text-muted mb-0">Review and manage employee access requests</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchRequests}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          <Link to="/admin/dashboard" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Reject Modal */}
      {selectedRequest && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Reject Request</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setSelectedRequest(null)
                    setRejectNotes('')
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>User:</strong> {selectedRequest.userFullName} ({selectedRequest.userEmail})<br/>
                  <strong>Requested:</strong> {formatDate(selectedRequest.requestedAt)}
                </p>
                <div className="mb-3">
                  <label htmlFor="rejectNotes" className="form-label">
                    Rejection Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    id="rejectNotes"
                    rows="3"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Provide feedback for the user (optional)..."
                  />
                  <small className="form-text text-muted">
                    This feedback will be shown to the user.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedRequest(null)
                    setRejectNotes('')
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={processing[selectedRequest.id]}
                >
                  {processing[selectedRequest.id] ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Rejecting...
                    </>
                  ) : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="card mb-4 border-warning shadow">
          <div className="card-header bg-warning text-dark">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Pending Requests ({pendingRequests.length})
              </h5>
              <span className="badge bg-dark">Action Required</span>
            </div>
          </div>
          <div className="card-body">
            {pendingRequests.map(request => (
              <div key={request.id} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="card-title">{request.userFullName || 'User'}</h5>
                      <p className="card-text text-muted mb-1">
                        <i className="bi bi-envelope me-1"></i>
                        {request.userEmail}
                      </p>
                      <p className="card-text">
                        <strong>Reason:</strong> {request.reason || 'No reason provided'}
                      </p>
                      <small className="text-muted">
                        <i className="bi bi-calendar me-1"></i>
                        Requested: {formatDate(request.requestedAt)}
                      </small>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={processing[request.id]}
                      >
                        {processing[request.id] ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="bi bi-check-lg me-1"></i>
                        )}
                        Approve
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setSelectedRequest(request)}
                        disabled={processing[request.id]}
                      >
                        <i className="bi bi-x-lg me-1"></i>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Requests */}
      <div className="card shadow">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-list-check me-2"></i>
              All Requests ({requests.length})
            </h5>
          </div>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted mb-3"></i>
              <h4>No employee requests</h4>
              <p className="text-muted">
                There are no employee requests in the system
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Reviewed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => (
                    <tr key={request.id}>
                      <td>{request.userFullName || 'User'}</td>
                      <td>{request.userEmail}</td>
                      <td>
                        <small className="text-muted">
                          {request.reason ? 
                            (request.reason.length > 50 ? `${request.reason.substring(0, 50)}...` : request.reason) 
                            : 'No reason'}
                        </small>
                      </td>
                      <td>
                        <span className={`badge ${
                          request.status === 'PENDING' ? 'bg-warning' :
                          request.status === 'APPROVED' ? 'bg-success' : 'bg-danger'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        <small>{formatDate(request.requestedAt)}</small>
                      </td>
                      <td>
                        <small>{formatDate(request.reviewedAt) || 'Not reviewed'}</small>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {request.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handleApprove(request.id)}
                                disabled={processing[request.id]}
                                title="Approve"
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => setSelectedRequest(request)}
                                disabled={processing[request.id]}
                                title="Reject"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-outline-info" 
                            title="View Details"
                            onClick={() => alert(`Request Details:\n\nUser: ${request.userFullName}\nEmail: ${request.userEmail}\nReason: ${request.reason}\nStatus: ${request.status}\nRequested: ${formatDate(request.requestedAt)}\nReviewed: ${formatDate(request.reviewedAt) || 'Not reviewed'}\nAdmin Notes: ${request.adminNotes || 'None'}`)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="card-footer text-muted">
          <div className="row">
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-warning me-1"></i>
                <strong>PENDING:</strong> {pendingRequests.length}
              </small>
            </div>
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-success me-1"></i>
                <strong>APPROVED:</strong> {approvedRequests.length}
              </small>
            </div>
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-danger me-1"></i>
                <strong>REJECTED:</strong> {rejectedRequests.length}
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default EmployeeRequests