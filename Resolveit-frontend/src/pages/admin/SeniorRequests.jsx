import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { seniorRequestAPI } from '../../services/api'
import { 
  FaUsers, FaCheckCircle, FaTimes, FaClock, 
  FaFilter, FaSync, FaEye, FaUserGraduate,
  FaComment, FaHistory, FaArrowUp, FaExclamationTriangle,
  FaChartBar, FaUserCheck, FaTag, FaInfoCircle, FaSpinner,
  FaUser, FaChartLine, FaFileAlt, FaStar, FaCrown,
  FaSort, FaSortUp, FaSortDown, FaSearch
} from 'react-icons/fa'

const SeniorRequests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'requestedAt', direction: 'desc' })
  const { user } = useAuth()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📤 Fetching senior requests from API...')
      
      // Call the API
      const response = await seniorRequestAPI.getAllRequests()
      console.log('✅ Raw API response:', response)
      
      // Your API returns: {success: true, data: [...], count: X}
      if (response && response.success) {
        const requestsData = response.data || []
        console.log('✅ Processed requests data:', requestsData)
        
        setRequests(requestsData)
        
        // Calculate stats
        const total = requestsData.length
        const pending = requestsData.filter(r => r.status === 'PENDING').length
        const approved = requestsData.filter(r => r.status === 'APPROVED').length
        const rejected = requestsData.filter(r => r.status === 'REJECTED').length
        
        setStats({ total, pending, approved, rejected })
      } else {
        console.error('❌ API returned unsuccessful:', response)
        setError(response?.error || 'Failed to load senior requests')
        setRequests([])
      }
      
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError(err.message || 'Failed to load senior requests. Please try again.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId, employeeId) => {
    if (!window.confirm('Are you sure you want to approve this senior request?\n\nThis will promote the employee to Senior role.')) {
      return
    }

    const feedback = window.prompt('Add optional notes for the employee (or leave empty):', 'Congratulations! Your request has been approved.')
    
    setProcessing(prev => ({ ...prev, [requestId]: 'approving' }))
    
    try {
      console.log(`📤 Approving request ${requestId} for employee ${employeeId}`)
      
      // Your API expects: PUT /api/senior-requests/admin/{id}/approve
      const response = await seniorRequestAPI.approveRequest(requestId, employeeId)
      console.log('✅ Approve response:', response)
      
      if (response && response.success) {
        alert('✅ Request approved successfully!\nEmployee has been promoted to Senior role.')
        fetchRequests() // Refresh the list
      } else {
        alert('❌ Failed to approve request: ' + (response?.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('❌ Approve error:', err)
      alert('❌ Failed to approve request: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: null }))
    }
  }

  const handleReject = async (requestId, employeeName) => {
    const feedback = window.prompt(`Please provide a reason for rejecting ${employeeName}'s request (required):`, '')
    if (feedback === null) return
    if (feedback.trim() === '') {
      alert('Rejection reason is required.')
      return
    }

    if (!window.confirm(`Are you sure you want to reject ${employeeName}'s request?\n\nReason: ${feedback}`)) {
      return
    }

    setProcessing(prev => ({ ...prev, [requestId]: 'rejecting' }))
    
    try {
      console.log(`📤 Rejecting request ${requestId}`)
      
      // Your API expects: PUT /api/senior-requests/admin/{id}/reject
      const response = await seniorRequestAPI.rejectRequest(requestId, feedback)
      console.log('✅ Reject response:', response)
      
      if (response && response.success) {
        alert('✅ Request rejected successfully!')
        fetchRequests() // Refresh the list
      } else {
        alert('❌ Failed to reject request: ' + (response?.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('❌ Reject error:', err)
      alert('❌ Failed to reject request: ' + (err.response?.data?.error || err.message || 'Unknown error'))
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: null }))
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getFilteredRequests = () => {
    let filtered = requests
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter)
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r => 
        (r.employeeName && r.employeeName.toLowerCase().includes(term)) ||
        (r.employeeEmail && r.employeeEmail.toLowerCase().includes(term)) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
        (r.qualifications && r.qualifications.toLowerCase().includes(term))
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortConfig.key === 'employeeName') {
        const nameA = a.employeeName || ''
        const nameB = b.employeeName || ''
        return sortConfig.direction === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA)
      }
      
      if (sortConfig.key === 'requestedAt') {
        const dateA = new Date(a.requestedAt || 0)
        const dateB = new Date(b.requestedAt || 0)
        return sortConfig.direction === 'asc' 
          ? dateA - dateB
          : dateB - dateA
      }
      
      if (sortConfig.key === 'resolutionRate') {
        const rateA = a.resolutionRate || 0
        const rateB = b.resolutionRate || 0
        return sortConfig.direction === 'asc' 
          ? rateA - rateB
          : rateB - rateA
      }
      
      return 0
    })
    
    return filtered
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING': return { 
        class: 'badge bg-warning text-dark', 
        icon: <FaClock />, 
        label: 'Pending Review',
        color: 'warning'
      }
      case 'APPROVED': return { 
        class: 'badge bg-success', 
        icon: <FaCheckCircle />, 
        label: 'Approved',
        color: 'success'
      }
      case 'REJECTED': return { 
        class: 'badge bg-danger', 
        icon: <FaTimes />, 
        label: 'Rejected',
        color: 'danger'
      }
      default: return { 
        class: 'badge bg-secondary', 
        icon: null, 
        label: status,
        color: 'secondary'
      }
    }
  }

  const getResolutionBadge = (rate) => {
    if (rate >= 90) return 'success'
    if (rate >= 80) return 'warning'
    return 'danger'
  }

  const showRequestDetails = (request) => {
    setSelectedRequest(request)
  }

  const closeDetails = () => {
    setSelectedRequest(null)
  }

  const refreshData = () => {
    fetchRequests()
  }

  const clearFilters = () => {
    setFilter('all')
    setSearchTerm('')
    setSortConfig({ key: 'requestedAt', direction: 'desc' })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-muted" />
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="text-primary" /> 
      : <FaSortDown className="text-primary" />
  }

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading senior requests...</p>
      </div>
    )
  }

  const filteredRequests = getFilteredRequests()
  const hasFilters = filter !== 'all' || searchTerm

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">
            <FaCrown className="me-2 text-warning" />
            Senior Promotion Requests
          </h1>
          <p className="text-muted mb-0">Review and manage employee requests for senior position promotion</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={refreshData}
            disabled={loading}
          >
            <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/admin/dashboard" className="btn btn-outline-secondary">
            <FaArrowUp className="me-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <div className="flex-grow-1">
              <strong>Error:</strong> {error}
              <div className="mt-2">
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={refreshData}
                >
                  Try Again
                </button>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">Total Requests</div>
                  <div className="h2 mb-0 text-primary">{stats.total}</div>
                </div>
                <div className="ms-3">
                  <FaUsers className="fa-2x text-primary opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">Pending Review</div>
                  <div className="h2 mb-0 text-warning">{stats.pending}</div>
                </div>
                <div className="ms-3">
                  <FaClock className="fa-2x text-warning opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">Approved</div>
                  <div className="h2 mb-0 text-success">{stats.approved}</div>
                </div>
                <div className="ms-3">
                  <FaCheckCircle className="fa-2x text-success opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-danger shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">Rejected</div>
                  <div className="h2 mb-0 text-danger">{stats.rejected}</div>
                </div>
                <div className="ms-3">
                  <FaTimes className="fa-2x text-danger opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">
                <FaFilter className="me-2" />
                Filter by Status
              </label>
              <select 
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses ({stats.total})</option>
                <option value="PENDING">Pending Review ({stats.pending})</option>
                <option value="APPROVED">Approved ({stats.approved})</option>
                <option value="REJECTED">Rejected ({stats.rejected})</option>
              </select>
            </div>
            
            <div className="col-md-5">
              <label className="form-label fw-bold">
                <FaSearch className="me-2" />
                Search Requests
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by employee name, email, or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-3 d-flex align-items-end">
              <div className="w-100">
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                >
                  <FaTimes className="me-2" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
          
          <div className="row mt-3">
            <div className="col-12">
              <div className="alert alert-info mb-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <FaInfoCircle className="me-2" />
                    Showing <strong>{filteredRequests.length}</strong> of <strong>{requests.length}</strong> requests
                    {hasFilters && ' (filtered)'}
                  </div>
                  <div>
                    <button 
                      className="btn btn-sm btn-outline-info"
                      onClick={() => console.log('Current requests:', requests)}
                    >
                      Debug Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaUserGraduate className="me-2" />
              Senior Promotion Requests
              <span className="badge bg-light text-dark ms-2">
                {requests.length} total
              </span>
            </h5>
            <div className="d-flex align-items-center">
              <span className="badge bg-light text-dark me-3">
                <FaUser className="me-1" />
                Admin: {user?.fullName || 'Admin'}
              </span>
              <button 
                className="btn btn-sm btn-light"
                onClick={refreshData}
                disabled={loading}
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaUserGraduate className="display-1 text-muted opacity-50" />
              </div>
              <h4 className="text-muted">No Senior Requests Found</h4>
              <p className="text-muted mb-4">
                No employees have submitted requests for senior position promotion yet.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button 
                  className="btn btn-primary"
                  onClick={refreshData}
                  disabled={loading}
                >
                  <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
                  Check Again
                </button>
                <Link to="/admin/employees" className="btn btn-outline-primary">
                  <FaUsers className="me-2" />
                  View Employees
                </Link>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-5">
              <FaFilter className="display-1 text-muted mb-3" />
              <h4>No Matching Requests</h4>
              <p className="text-muted mb-4">
                No requests match your current filters. Try adjusting your search criteria.
              </p>
              <button 
                className="btn btn-primary"
                onClick={clearFilters}
              >
                <FaTimes className="me-2" />
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '80px' }}>
                      <button 
                        className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center"
                        onClick={() => handleSort('id')}
                      >
                        ID {getSortIcon('id')}
                      </button>
                    </th>
                    <th>
                      <button 
                        className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center"
                        onClick={() => handleSort('employeeName')}
                      >
                        Employee {getSortIcon('employeeName')}
                      </button>
                    </th>
                    <th>
                      <button 
                        className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center"
                        onClick={() => handleSort('requestedAt')}
                      >
                        Request Date {getSortIcon('requestedAt')}
                      </button>
                    </th>
                    <th>
                      <button 
                        className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center"
                        onClick={() => handleSort('resolutionRate')}
                      >
                        Performance {getSortIcon('resolutionRate')}
                      </button>
                    </th>
                    <th>Status</th>
                    <th style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(request => {
                    const status = getStatusBadge(request.status)
                    const resolutionBadge = getResolutionBadge(request.resolutionRate || 0)
                    
                    return (
                      <tr key={request.id} className={request.status === 'PENDING' ? 'table-warning' : ''}>
                        <td className="align-middle">
                          <span className="badge bg-secondary">#{request.id}</span>
                        </td>
                        <td className="align-middle">
                          <div>
                            <div className="fw-bold d-flex align-items-center">
                              <FaUser className="me-2 text-muted" size="14" />
                              {request.employeeName || 'Unknown'}
                            </div>
                            <small className="text-muted d-block">{request.employeeEmail || 'No email'}</small>
                            <small className="badge bg-info text-dark mt-1">
                              ID: {request.employeeId || 'N/A'}
                            </small>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="small">
                            <div className="d-flex align-items-center">
                              <FaClock className="me-2 text-muted" size="12" />
                              {formatDate(request.requestedAt)}
                            </div>
                            {request.reviewedAt && (
                              <div className="text-muted mt-1">
                                <small>
                                  <FaHistory className="me-1" size="10" />
                                  Reviewed: {formatDate(request.reviewedAt)}
                                </small>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="small">
                            <div className="d-flex align-items-center mb-1">
                              <FaChartBar className={`me-2 text-${resolutionBadge}`} size="14" />
                              <span>
                                <strong>{request.resolvedComplaints || 0}</strong> / {request.totalComplaints || 0} resolved
                              </span>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className={`progress-bar bg-${resolutionBadge}`}
                                style={{ width: `${request.resolutionRate || 0}%` }}
                                role="progressbar"
                                aria-valuenow={request.resolutionRate || 0}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                            <div className="d-flex justify-content-between mt-1">
                              <small className="text-muted">
                                Rate: <strong>{Math.round(request.resolutionRate || 0)}%</strong>
                              </small>
                              {(request.resolutionRate || 0) >= 80 && (
                                <small className={`text-${resolutionBadge}`}>
                                  <FaStar size="10" className="me-1" />
                                  Eligible
                                </small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${status.class} p-2 d-inline-flex align-items-center`}>
                            {status.icon} {status.label}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-info"
                              onClick={() => showRequestDetails(request)}
                              title="View Details"
                              disabled={processing[request.id]}
                            >
                              <FaEye />
                            </button>
                            
                            {request.status === 'PENDING' && (
                              <>
                                <button
                                  className="btn btn-outline-success"
                                  onClick={() => handleApprove(request.id, request.employeeId)}
                                  disabled={processing[request.id]}
                                  title="Approve Request"
                                >
                                  {processing[request.id] === 'approving' ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <FaCheckCircle />
                                  )}
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleReject(request.id, request.employeeName)}
                                  disabled={processing[request.id]}
                                  title="Reject Request"
                                >
                                  {processing[request.id] === 'rejecting' ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <FaTimes />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="card-footer bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">
                <FaInfoCircle className="me-1" />
                Senior employees can handle escalated complaints and provide guidance to regular employees.
              </small>
            </div>
            <div className="d-flex gap-2">
              <span className="badge bg-secondary">
                Showing {filteredRequests.length} of {requests.length}
              </span>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={refreshData}
                disabled={loading}
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <FaUserGraduate className="me-2" />
                  Request Details
                  <span className="badge bg-light text-dark ms-2">ID: #{selectedRequest.id}</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeDetails}></button>
              </div>
              
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card border-primary mb-3">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">
                          <FaUser className="me-2" />
                          Employee Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Name:</strong>
                          <div className="fw-bold text-primary fs-5">{selectedRequest.employeeName || 'Unknown'}</div>
                        </div>
                        <div className="mb-3">
                          <strong>Email:</strong>
                          <div className="text-break">{selectedRequest.employeeEmail || 'No email'}</div>
                        </div>
                        <div className="mb-3">
                          <strong>Employee ID:</strong>
                          <div className="badge bg-secondary fs-6">{selectedRequest.employeeId || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="card border-primary mb-3">
                      <div className="card-header bg-primary text-white">
                        <h6 className="mb-0">
                          <FaFileAlt className="me-2" />
                          Request Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <strong>Status:</strong>
                          <div className="mt-1">
                            <span className={`badge ${getStatusBadge(selectedRequest.status).class} fs-6 p-2`}>
                              {getStatusBadge(selectedRequest.status).icon} {getStatusBadge(selectedRequest.status).label}
                            </span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <strong>Submitted:</strong>
                          <div>{formatDate(selectedRequest.requestedAt)}</div>
                        </div>
                        {selectedRequest.reviewedAt && (
                          <div className="mb-3">
                            <strong>Reviewed:</strong>
                            <div>{formatDate(selectedRequest.reviewedAt)}</div>
                          </div>
                        )}
                        {selectedRequest.adminNotes && (
                          <div className="mb-3">
                            <strong>Admin Notes:</strong>
                            <div className="alert alert-info p-2 mb-0">{selectedRequest.adminNotes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="card border-info mb-4">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">
                      <FaChartLine className="me-2" />
                      Performance Statistics
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row text-center mb-3">
                      <div className="col-4">
                        <div className="display-6 text-primary">{selectedRequest.totalComplaints || 0}</div>
                        <small className="text-muted">Total Assigned</small>
                      </div>
                      <div className="col-4">
                        <div className="display-6 text-success">{selectedRequest.resolvedComplaints || 0}</div>
                        <small className="text-muted">Resolved</small>
                      </div>
                      <div className="col-4">
                        <div className="display-6 text-warning">{Math.round(selectedRequest.resolutionRate || 0)}%</div>
                        <small className="text-muted">Resolution Rate</small>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '15px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${selectedRequest.resolutionRate || 0}%` }}
                        role="progressbar"
                      >
                        {Math.round(selectedRequest.resolutionRate || 0)}%
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        Minimum required: 80% | This employee: {Math.round(selectedRequest.resolutionRate || 0)}%
                      </small>
                    </div>
                  </div>
                </div>

                {/* Application Details */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <FaComment className="me-2" />
                      Application Details
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-4">
                      <h6>Reason for Request</h6>
                      <div className="alert alert-light p-3">
                        {selectedRequest.reason || 'No reason provided'}
                      </div>
                    </div>

                    {selectedRequest.qualifications && (
                      <div className="mb-4">
                        <h6>Qualifications</h6>
                        <div className="alert alert-light p-3">
                          {selectedRequest.qualifications}
                        </div>
                      </div>
                    )}

                    {selectedRequest.experience && (
                      <div className="mb-4">
                        <h6>Experience</h6>
                        <div className="alert alert-light p-3">
                          {selectedRequest.experience}
                        </div>
                      </div>
                    )}

                    {selectedRequest.additionalInfo && (
                      <div className="mb-4">
                        <h6>Additional Information</h6>
                        <div className="alert alert-light p-3">
                          {selectedRequest.additionalInfo}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDetails}>
                  Close
                </button>
                {selectedRequest.status === 'PENDING' && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        handleReject(selectedRequest.id, selectedRequest.employeeName)
                        closeDetails()
                      }}
                      disabled={processing[selectedRequest.id]}
                    >
                      {processing[selectedRequest.id] === 'rejecting' ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <FaTimes className="me-2" />
                      )}
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => {
                        handleApprove(selectedRequest.id, selectedRequest.employeeId)
                        closeDetails()
                      }}
                      disabled={processing[selectedRequest.id]}
                    >
                      {processing[selectedRequest.id] === 'approving' ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <FaCheckCircle className="me-2" />
                      )}
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeniorRequests