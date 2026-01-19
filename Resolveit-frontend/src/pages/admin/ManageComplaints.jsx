import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { Link } from 'react-router-dom'

const ManageComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState({})
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [statusComment, setStatusComment] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📤 Fetching complaints and employees...')
      
      const [complaintsRes, employeesRes] = await Promise.all([
        adminAPI.getAllComplaints(),
        adminAPI.getEmployees()
      ])
      
      console.log('✅ Complaints response:', complaintsRes)
      console.log('✅ Employees response:', employeesRes)
      
      // Handle different response formats
      const complaintsData = complaintsRes?.data || complaintsRes || []
      const employeesData = employeesRes?.data || employeesRes || []
      
      setComplaints(Array.isArray(complaintsData) ? complaintsData : [])
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      
    } catch (err) {
      console.error('❌ Failed to fetch data:', err)
      setError('Failed to load data. Please try again.')
      setComplaints([])
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (complaintId, newStatus) => {
    setUpdating(prev => ({ ...prev, [complaintId]: true }))
    
    try {
      const updateData = {
        status: newStatus,
        comment: statusComment,
        internalNote: internalNote,
        assignEmployeeId: assignEmployeeId || null
      }
      
      console.log('📤 Updating complaint:', complaintId, updateData)
      await adminAPI.updateComplaintStatus(complaintId, updateData)
      
      // Reset form
      setSelectedComplaint(null)
      setStatusComment('')
      setInternalNote(false)
      setAssignEmployeeId('')
      
      // Refresh data
      await fetchData()
      
      alert('Complaint updated successfully!')
    } catch (err) {
      console.error('❌ Failed to update complaint:', err)
      alert('Failed to update complaint. Please try again.')
    } finally {
      setUpdating(prev => ({ ...prev, [complaintId]: false }))
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
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  const statusOptions = ['NEW', 'UNDER_REVIEW', 'RESOLVED']

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-secondary'
    
    switch(status) {
      case 'NEW': return 'bg-info';
      case 'UNDER_REVIEW': return 'bg-warning';
      case 'RESOLVED': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  const getUrgencyBadgeClass = (urgency) => {
    if (!urgency) return 'bg-secondary'
    
    switch(urgency) {
      case 'HIGH': return 'bg-danger';
      case 'MEDIUM': return 'bg-warning';
      case 'NORMAL': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading complaints data...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Manage Complaints</h2>
          <p className="text-muted mb-0">
            View and manage all complaints in the system
          </p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchData}
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
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Admin Controls */}
      {selectedComplaint && (
        <div className="card mb-4 shadow">
          <div className="card-header bg-primary text-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Manage Complaint: {selectedComplaint.title}
              </h5>
              <button 
                className="btn btn-sm btn-light"
                onClick={() => setSelectedComplaint(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Update Status</label>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {statusOptions.map(status => (
                    <button
                      key={status}
                      className={`btn ${
                        selectedComplaint.status === status 
                          ? 'btn-primary' 
                          : 'btn-outline-primary'
                      }`}
                      onClick={() => handleStatusUpdate(selectedComplaint.id, status)}
                      disabled={updating[selectedComplaint.id]}
                      title={`Set status to ${status.replace('_', ' ')}`}
                    >
                      {updating[selectedComplaint.id] ? (
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      ) : null}
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                
                <div className="form-text text-muted">
                  Current status: <span className={`badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                    {selectedComplaint.status ? selectedComplaint.status.replace('_', ' ') : 'UNKNOWN'}
                  </span>
                </div>
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Assign to Employee</label>
                <select
                  className="form-select"
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                >
                  <option value="">Select employee</option>
                  {employees.length > 0 ? (
                    employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} ({employee.email})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No employees available</option>
                  )}
                </select>
                <div className="form-text text-muted">
                  Currently assigned to: {selectedComplaint.assignedEmployeeName || 'Unassigned'}
                </div>
              </div>
              
              <div className="col-md-12 mb-3">
                <label className="form-label fw-bold">Status Comment</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Add a comment about this status change..."
                />
                <div className="form-text">
                  This comment will be visible in the complaint timeline.
                </div>
              </div>
              
              <div className="col-md-12 mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="internalNote"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="internalNote">
                    Internal note (visible only to staff)
                  </label>
                </div>
              </div>
              
              <div className="col-md-12">
                <div className="d-flex justify-content-end gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedComplaint(null)
                      setStatusComment('')
                      setInternalNote(false)
                      setAssignEmployeeId('')
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to update this complaint?')) {
                        handleStatusUpdate(selectedComplaint.id, selectedComplaint.status)
                      }
                    }}
                    disabled={updating[selectedComplaint.id]}
                  >
                    {updating[selectedComplaint.id] ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : 'Update Complaint'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="card shadow">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-list-task me-2"></i>
              All Complaints
            </h5>
            <span className="badge bg-primary">
              Total: {complaints.length}
            </span>
          </div>
        </div>
        <div className="card-body">
          {complaints.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted mb-3"></i>
              <h4>No complaints found</h4>
              <p className="text-muted">
                There are no complaints in the system yet
              </p>
              <button 
                className="btn btn-outline-primary"
                onClick={fetchData}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Urgency</th>
                      <th>Submitted By</th>
                      <th>Assigned To</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map(complaint => (
                      <tr key={complaint.id} className="align-middle">
                        <td>
                          <span className="badge bg-secondary">#{complaint.id}</span>
                        </td>
                        <td>
                          <div>
                            <strong className="d-block">{complaint.title}</strong>
                            <small className="text-muted">
                              {complaint.description?.substring(0, 50)}...
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {complaint.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(complaint.status)}`}>
                            {complaint.status ? complaint.status.replace('_', ' ') : 'UNKNOWN'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getUrgencyBadgeClass(complaint.urgency)}`}>
                            {complaint.urgency || 'NORMAL'}
                          </span>
                        </td>
                        <td>
                          {complaint.anonymous 
                            ? <span className="badge bg-dark">Anonymous</span>
                            : complaint.userFullName 
                              ? <span className="text-primary">{complaint.userFullName}</span>
                              : <span className="text-muted">N/A</span>
                          }
                        </td>
                        <td>
                          {complaint.assignedEmployeeName 
                            ? <span className="text-success">{complaint.assignedEmployeeName}</span>
                            : <span className="text-warning">Unassigned</span>
                          }
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDate(complaint.createdAt)}
                          </small>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => {
                                setSelectedComplaint(complaint)
                                setAssignEmployeeId(complaint.assignedEmployeeId || '')
                              }}
                              title="Manage complaint"
                            >
                              <i className="bi bi-gear"></i>
                            </button>
                            <Link
                              to={`/complaints/${complaint.id}`}
                              className="btn btn-outline-secondary"
                              title="View details"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <button
                              className="btn btn-outline-info"
                              onClick={() => {
                                // Quick status update to RESOLVED
                                if (window.confirm(`Mark complaint "${complaint.title}" as RESOLVED?`)) {
                                  handleStatusUpdate(complaint.id, 'RESOLVED')
                                }
                              }}
                              title="Mark as resolved"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4">
                <div className="alert alert-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-info-circle me-2"></i>
                      Showing <strong>{complaints.length}</strong> complaint{complaints.length !== 1 ? 's' : ''}
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={fetchData}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Refresh List
                      </button>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <i className="bi bi-arrow-up me-1"></i>
                        Back to Top
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="card-footer text-muted">
          <div className="row">
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-info me-1"></i>
                <strong>NEW:</strong> {complaints.filter(c => c.status === 'NEW').length}
              </small>
            </div>
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-warning me-1"></i>
                <strong>UNDER REVIEW:</strong> {complaints.filter(c => c.status === 'UNDER_REVIEW').length}
              </small>
            </div>
            <div className="col-md-4">
              <small>
                <i className="bi bi-circle-fill text-success me-1"></i>
                <strong>RESOLVED:</strong> {complaints.filter(c => c.status === 'RESOLVED').length}
              </small>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="row mt-4">
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <div className="h5 mb-1">{complaints.length}</div>
              <small className="text-muted">Total Complaints</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <div className="h5 mb-1">{complaints.filter(c => c.assignedEmployeeId).length}</div>
              <small className="text-muted">Assigned</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <div className="h5 mb-1">{complaints.filter(c => !c.anonymous).length}</div>
              <small className="text-muted">Non-Anonymous</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body py-3">
              <div className="h5 mb-1">{employees.length}</div>
              <small className="text-muted">Total Employees</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageComplaints