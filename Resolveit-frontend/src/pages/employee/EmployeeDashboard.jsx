import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { employeeAPI, escalationAPI, dashboardAPI } from '../../services/api'
import { 
  FaTasks, FaArrowUp, FaClock, FaCheckCircle, FaExclamationTriangle,
  FaFilter, FaSync, FaEye, FaComment, FaPaperclip, FaChartLine,
  FaUser, FaCalendar, FaSearch, FaList, FaTimes, FaUserGraduate
} from 'react-icons/fa'

const EmployeeDashboard = () => {
  const [assignedComplaints, setAssignedComplaints] = useState([])
  const [escalatedComplaints, setEscalatedComplaints] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [updating, setUpdating] = useState({})
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('assigned') // 'assigned' or 'escalated'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    comment: '',
    internalNote: false
  })
  
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    console.log('🔄 EmployeeDashboard mounted, user:', user)
    if (user && (user.role === 'EMPLOYEE' || user.role === 'ADMIN')) {
      loadAllData()
    } else if (user) {
      navigate('/public-complaints')
    }
  }, [user, navigate])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load all data in parallel
      await Promise.all([
        fetchAssignedComplaints(),
        fetchEscalatedComplaints(),
        fetchDashboardStats()
      ])
      
    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }

  const fetchAssignedComplaints = async () => {
    try {
      console.log('📤 Fetching assigned complaints...')
      
      const response = await employeeAPI.getAssignedComplaints()
      console.log('✅ Assigned complaints response:', response)
      
      // Handle different response formats
      let complaintsData = []
      
      if (Array.isArray(response)) {
        complaintsData = response
      } else if (response && Array.isArray(response.data)) {
        complaintsData = response.data
      } else if (response && response.success && Array.isArray(response.data)) {
        complaintsData = response.data
      } else if (response && response.success && Array.isArray(response.complaints)) {
        complaintsData = response.complaints
      } else if (response && typeof response === 'object') {
        // Try to extract array from any property
        for (const key in response) {
          if (Array.isArray(response[key])) {
            complaintsData = response[key]
            break
          }
        }
      }
      
      console.log('✅ Processed assigned complaints:', complaintsData)
      setAssignedComplaints(complaintsData)
      
    } catch (err) {
      console.error('❌ Failed to fetch assigned complaints:', err)
      setError('Failed to load assigned complaints. Please try again.')
      setAssignedComplaints([])
    }
  }

  const fetchEscalatedComplaints = async () => {
    try {
      console.log('📤 Fetching escalated complaints...')
      
      const response = await escalationAPI.getEscalatedComplaints()
      console.log('✅ Escalated complaints response:', response)
      
      let complaintsData = []
      
      if (response && response.success && Array.isArray(response.data)) {
        complaintsData = response.data
      } else if (Array.isArray(response)) {
        complaintsData = response
      } else if (response && Array.isArray(response.escalatedComplaints)) {
        complaintsData = response.escalatedComplaints
      }
      
      console.log('✅ Processed escalated complaints:', complaintsData)
      setEscalatedComplaints(complaintsData)
      
    } catch (err) {
      console.error('❌ Failed to fetch escalated complaints:', err)
      // Don't show error if just unauthorized (employees might not have access)
      if (err.status !== 403) {
        console.warn('Note: Employees might not have access to escalated complaints endpoint')
      }
      setEscalatedComplaints([])
    }
  }

  const fetchDashboardStats = async () => {
    try {
      console.log('📊 Fetching dashboard stats...')
      
      const response = await dashboardAPI.getEmployeeDashboard()
      console.log('✅ Dashboard stats response:', response)
      
      if (response) {
        setDashboardStats(response)
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch dashboard stats:', err)
      // Continue without stats
    }
  }

  const openStatusModal = (complaint) => {
    setSelectedComplaint(complaint)
    setStatusUpdateData({
      status: complaint.status || 'NEW',
      comment: '',
      internalNote: false
    })
    setShowStatusModal(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedComplaint) return
    
    const { status, comment, internalNote } = statusUpdateData
    
    if (!status) {
      alert('Please select a status')
      return
    }
    
    setUpdating(prev => ({ ...prev, [selectedComplaint.id]: true }))
    
    try {
      console.log(`📤 Updating complaint ${selectedComplaint.id} status to ${status}`)
      
      const response = await employeeAPI.updateComplaint(selectedComplaint.id, {
        status,
        comment,
        internalNote
      })
      
      console.log('✅ Status update response:', response)
      
      if (response.success) {
        // Update the local state for assigned complaints
        if (activeTab === 'assigned') {
          setAssignedComplaints(prev => 
            prev.map(complaint => 
              complaint.id === selectedComplaint.id 
                ? { 
                    ...complaint, 
                    status: status,
                    updatedAt: new Date().toISOString(),
                    ...(response.complaint || {})
                  }
                : complaint
            )
          )
        }
        
        alert('✅ Status updated successfully!')
        setShowStatusModal(false)
        setSelectedComplaint(null)
        setStatusUpdateData({
          status: '',
          comment: '',
          internalNote: false
        })
        
        // Refresh data
        fetchAssignedComplaints()
        
      } else {
        throw new Error(response.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('❌ Failed to update status:', err)
      alert(`❌ Failed to update complaint status: ${err.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [selectedComplaint.id]: false }))
    }
  }

  const handleQuickStatusUpdate = async (complaintId, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus.replace('_', ' ')}"?`)) {
      return
    }
    
    setUpdating(prev => ({ ...prev, [complaintId]: true }))
    
    try {
      console.log(`📤 Quick updating complaint ${complaintId} status to ${newStatus}`)
      
      const response = await employeeAPI.updateComplaintStatus(complaintId, newStatus)
      
      console.log('✅ Quick status update response:', response)
      
      if (response.success) {
        // Update the local state
        if (activeTab === 'assigned') {
          setAssignedComplaints(prev => 
            prev.map(complaint => 
              complaint.id === complaintId 
                ? { 
                    ...complaint, 
                    status: newStatus, 
                    updatedAt: new Date().toISOString(),
                    ...(response.complaint || {})
                  }
                : complaint
            )
          )
        }
        
        alert('✅ Status updated successfully!')
        
        // Refresh data
        fetchAssignedComplaints()
        
      } else {
        throw new Error(response.error || 'Failed to update status')
      }
    } catch (err) {
      console.error('❌ Failed to update status:', err)
      alert(`❌ Failed to update complaint status: ${err.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [complaintId]: false }))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      
      return date.toLocaleDateString('en-US', {
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

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-secondary'
    
    const statusUpper = status.toUpperCase()
    switch(statusUpper) {
      case 'NEW': return 'bg-info';
      case 'UNDER_REVIEW': return 'bg-warning';
      case 'RESOLVED': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  const getUrgencyBadgeClass = (urgency) => {
    if (!urgency) return 'bg-secondary'
    
    const urgencyUpper = urgency.toUpperCase()
    switch(urgencyUpper) {
      case 'HIGH': return 'bg-danger';
      case 'MEDIUM': return 'bg-warning';
      case 'NORMAL': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  const statusOptions = [
    { value: 'NEW', label: 'New', color: 'info' },
    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'warning' },
    { value: 'RESOLVED', label: 'Resolved', color: 'success' }
  ]

  // Filter complaints based on active tab
  const getCurrentComplaints = () => {
    return activeTab === 'assigned' ? assignedComplaints : escalatedComplaints
  }

  const getFilteredComplaints = () => {
    const complaints = getCurrentComplaints()
    
    return complaints.filter(complaint => {
      const matchesSearch = searchTerm === '' || 
        complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.category?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'ALL' || 
        complaint.status?.toUpperCase() === filterStatus
      
      return matchesSearch && matchesStatus
    })
  }

  const renderComplaintCard = (complaint) => {
    const isEscalated = activeTab === 'escalated'
    
    return (
      <div key={complaint.id} className="col-md-6 mb-4">
        <div className={`card h-100 shadow-sm ${isEscalated ? 'border-warning' : ''}`}>
          <div className={`card-header ${isEscalated ? 'bg-warning text-dark' : 'bg-light'}`}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                {isEscalated && <FaArrowUp className="me-2" />}
                {complaint.title}
              </h5>
              <span className={`badge ${getStatusBadgeClass(complaint.status)}`}>
                {complaint.status ? complaint.status.replace('_', ' ') : 'UNKNOWN'}
              </span>
            </div>
          </div>
          
          <div className="card-body">
            <div className="mb-3">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="badge bg-secondary">
                  <FaList className="me-1" />
                  {complaint.category || 'Uncategorized'}
                </span>
                <span className={`badge ${getUrgencyBadgeClass(complaint.urgency)}`}>
                  <FaClock className="me-1" />
                  {complaint.urgency || 'NORMAL'}
                </span>
                {complaint.anonymous && (
                  <span className="badge bg-dark">
                    <FaUser className="me-1" />
                    Anonymous
                  </span>
                )}
                {complaint.isPublic && (
                  <span className="badge bg-success">
                    <FaEye className="me-1" />
                    Public
                  </span>
                )}
                {isEscalated && (
                  <span className="badge bg-danger">
                    <FaExclamationTriangle className="me-1" />
                    Escalated
                  </span>
                )}
              </div>
              
              <p className="card-text text-muted">
                {complaint.description?.length > 200
                  ? `${complaint.description.substring(0, 200)}...`
                  : complaint.description || 'No description provided'}
                {complaint.description?.length > 200 && (
                  <button 
                    className="btn btn-link btn-sm p-0 ms-1"
                    data-bs-toggle="collapse"
                    data-bs-target={`#desc-${complaint.id}`}
                  >
                    Read more
                  </button>
                )}
              </p>
              
              {complaint.description?.length > 200 && (
                <div className="collapse" id={`desc-${complaint.id}`}>
                  <p className="card-text text-muted">
                    {complaint.description.substring(200)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mb-3">
              <div className="row">
                <div className="col-6">
                  <small className="text-muted d-block">
                    <FaUser className="me-1" />
                    <strong>Submitted by:</strong><br/>
                    {complaint.anonymous ? 'Anonymous' : complaint.userFullName || 'N/A'}
                  </small>
                </div>
                <div className="col-6">
                  <small className="text-muted d-block">
                    <FaCalendar className="me-1" />
                    <strong>Created:</strong><br/>
                    {formatDate(complaint.createdAt)}
                  </small>
                </div>
              </div>
              
              {/* Complaint Stats */}
              <div className="row mt-2 pt-2 border-top">
                <div className="col-4 text-center">
                  <small className="text-muted d-block">
                    <span className="text-danger">♥</span>
                    {complaint.likeCount || 0} likes
                  </small>
                </div>
                <div className="col-4 text-center">
                  <small className="text-muted d-block">
                    <FaComment className="me-1" />
                    {complaint.commentCount || 0} comments
                  </small>
                </div>
                <div className="col-4 text-center">
                  <small className="text-muted d-block">
                    <FaPaperclip className="me-1" />
                    {complaint.attachmentCount || 0} files
                  </small>
                </div>
              </div>
            </div>
            
            {/* Status Update Controls - Only for assigned complaints */}
            {!isEscalated && (
              <div className="mb-3">
                <label className="form-label fw-bold">
                  <FaSync className="me-1" />
                  Update Status:
                </label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {statusOptions.map(option => (
                    <button
                      key={option.value}
                      className={`btn btn-sm ${
                        complaint.status?.toUpperCase() === option.value 
                          ? `btn-${option.color}` 
                          : `btn-outline-${option.color}`
                      }`}
                      onClick={() => handleQuickStatusUpdate(complaint.id, option.value)}
                      disabled={updating[complaint.id]}
                      title={`Set status to ${option.label}`}
                    >
                      {updating[complaint.id] ? (
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      ) : null}
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={() => openStatusModal(complaint)}
                  disabled={updating[complaint.id]}
                >
                  <FaComment className="me-1" />
                  Update with Details
                </button>
              </div>
            )}
            
            <div className="d-grid gap-2">
              <Link 
                to={`/complaints/${complaint.id}`}
                className="btn btn-outline-primary"
              >
                <FaEye className="me-1" />
                View Details
              </Link>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate(`/complaints/${complaint.id}#comments`)}
              >
                <FaComment className="me-1" />
                Add Comment
              </button>
            </div>
          </div>
          
          <div className="card-footer bg-transparent border-top-0">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                <FaClock className="me-1" />
                Last updated: {formatDate(complaint.updatedAt)}
              </small>
              <small className="text-muted">
                ID: #{complaint.id}
              </small>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="alert alert-warning">
        <FaExclamationTriangle className="me-2" />
        Please login to access the employee dashboard
      </div>
    )
  }

  if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
    return (
      <div className="alert alert-danger">
        <FaExclamationTriangle className="me-2" />
        Access denied. This page is for employees and administrators only.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading your dashboard...</p>
      </div>
    )
  }

  const filteredComplaints = getFilteredComplaints()
  const currentComplaints = getCurrentComplaints()

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <FaTasks className="me-2 text-primary" />
            Employee Dashboard
          </h2>
          <p className="text-muted mb-0">
            Welcome, <strong>{user.fullName}</strong>!
          </p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={loadAllData}
            disabled={loading}
          >
            <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/public-complaints" className="btn btn-outline-secondary btn-sm">
            <FaEye className="me-1" />
            View Public
          </Link>
          {user.role === 'EMPLOYEE' && (
            <Link to="/employee/request-senior" className="btn btn-warning btn-sm">
              <FaUserGraduate className="me-1" />
              Request Senior
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Stats Overview */}
      {dashboardStats && !statsLoading && (
        <div className="row mb-4">
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-primary shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-primary mb-1">{dashboardStats.totalComplaints || 0}</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-info shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-info mb-1">{dashboardStats.assignedToMe || 0}</div>
                <small className="text-muted">Assigned</small>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-warning shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-warning mb-1">{dashboardStats.escalatedToMe || 0}</div>
                <small className="text-muted">Escalated</small>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-success shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-success mb-1">{dashboardStats.resolvedComplaints || 0}</div>
                <small className="text-muted">Resolved</small>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-danger shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-danger mb-1">{dashboardStats.complaintsPastDue || 0}</div>
                <small className="text-muted">Past Due</small>
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6 mb-3">
            <div className="card border-secondary shadow-sm">
              <div className="card-body text-center py-3">
                <div className="h4 text-secondary mb-1">
                  {dashboardStats.averageResolutionTime ? 
                    `${dashboardStats.averageResolutionTime}h` : 'N/A'}
                </div>
                <small className="text-muted">Avg. Time</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="card mb-4">
        <div className="card-header bg-white">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'assigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('assigned')}
              >
                <FaTasks className="me-2" />
                Assigned Complaints
                <span className="badge bg-primary ms-2">{assignedComplaints.length}</span>
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'escalated' ? 'active' : ''}`}
                onClick={() => setActiveTab('escalated')}
              >
                <FaArrowUp className="me-2" />
                Escalated Complaints
                <span className="badge bg-warning ms-2">{escalatedComplaints.length}</span>
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body">
          {/* Filters */}
          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <label htmlFor="search" className="form-label">
                <FaSearch className="me-2" />
                Search {activeTab === 'assigned' ? 'Assigned' : 'Escalated'} Complaints
              </label>
              <input
                type="text"
                className="form-control"
                id="search"
                placeholder="Search by title, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="statusFilter" className="form-label">
                <FaFilter className="me-2" />
                Filter by Status
              </label>
              <select
                className="form-select"
                id="statusFilter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Complaints List */}
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                {activeTab === 'assigned' ? (
                  <FaTasks className="display-1 text-muted" />
                ) : (
                  <FaArrowUp className="display-1 text-muted" />
                )}
              </div>
              <h4 className="mb-2">
                No {activeTab === 'assigned' ? 'Assigned' : 'Escalated'} Complaints
              </h4>
              <p className="text-muted mb-4">
                {searchTerm || filterStatus !== 'ALL' 
                  ? 'No complaints match your search criteria. Try adjusting your filters.'
                  : activeTab === 'assigned'
                    ? 'You don\'t have any complaints assigned to you yet.'
                    : 'No complaints have been escalated to you.'}
              </p>
              
              {(searchTerm || filterStatus !== 'ALL') && (
                <button 
                  className="btn btn-outline-secondary mb-3"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterStatus('ALL')
                  }}
                >
                  <FaTimes className="me-1" />
                  Clear Filters
                </button>
              )}
              
              <div className="mt-3">
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={loadAllData}
                  disabled={loading}
                >
                  <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                  Refresh
                </button>
                {activeTab === 'escalated' && (
                  <button 
                    className="btn btn-outline-warning"
                    onClick={() => setActiveTab('assigned')}
                  >
                    <FaTasks className="me-1" />
                    View Assigned Complaints
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="alert alert-success mb-4">
                <FaCheckCircle className="me-2" />
                Showing <strong>{filteredComplaints.length}</strong> of <strong>{currentComplaints.length}</strong> {activeTab} complaint{filteredComplaints.length !== 1 ? 's' : ''}
                {(searchTerm || filterStatus !== 'ALL') && ' (filtered)'}
              </div>

              <div className="row">
                {filteredComplaints.map(complaint => renderComplaintCard(complaint))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedComplaint && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <FaSync className="me-2" />
                  Update Complaint Status
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowStatusModal(false)
                    setSelectedComplaint(null)
                  }}
                ></button>
              </div>
              
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Complaint</label>
                  <p className="form-control-plaintext">{selectedComplaint.title}</p>
                  <small className="text-muted">ID: #{selectedComplaint.id}</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-bold">New Status *</label>
                  <select 
                    className="form-select"
                    value={statusUpdateData.status}
                    onChange={(e) => setStatusUpdateData(prev => ({...prev, status: e.target.value}))}
                    required
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="form-text text-muted">
                    Current status: <span className={`badge ${getStatusBadgeClass(selectedComplaint.status)}`}>
                      {selectedComplaint.status ? selectedComplaint.status.replace('_', ' ') : 'UNKNOWN'}
                    </span>
                  </small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Comment (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={statusUpdateData.comment}
                    onChange={(e) => setStatusUpdateData(prev => ({...prev, comment: e.target.value}))}
                    placeholder="Add a comment about this status change..."
                    maxLength="500"
                  />
                  <small className="form-text text-muted">
                    {statusUpdateData.comment.length}/500 characters
                  </small>
                </div>
                
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="internalNote"
                      checked={statusUpdateData.internalNote}
                      onChange={(e) => setStatusUpdateData(prev => ({...prev, internalNote: e.target.checked}))}
                    />
                    <label className="form-check-label" htmlFor="internalNote">
                      Internal note (visible only to staff)
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowStatusModal(false)
                    setSelectedComplaint(null)
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleStatusUpdate}
                  disabled={updating[selectedComplaint.id] || !statusUpdateData.status}
                >
                  {updating[selectedComplaint.id] ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Updating...
                    </>
                  ) : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard