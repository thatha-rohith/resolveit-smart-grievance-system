import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { complaintAPI, seniorAPI } from '../../services/api'
import { 
  FaArrowUp, FaEye, FaClock, FaExclamationTriangle, 
  FaFilter, FaSort, FaSync, FaCalendar, FaUser,
  FaTag, FaPaperclip, FaComment, FaHeart, FaCheckCircle,
  FaSpinner, FaTimes, FaChartBar, FaUserTie, FaBullhorn,
  FaSearch, FaList, FaBan, FaShieldAlt, FaHistory,
  FaInfoCircle, FaDownload, FaFileExport, FaUsers,
  FaCrown, FaFlag, FaStar, FaCommentDots
} from 'react-icons/fa'

const EscalatedComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState({})
  const [loadStats, setLoadStats] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    resolved: 0,
    averageDays: 0,
    highPriority: 0
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchEscalatedComplaints()
    if (user?.role === 'SENIOR_EMPLOYEE' || user?.role === 'ADMIN') {
      fetchLoadStats()
    }
  }, [])

  const fetchEscalatedComplaints = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📤 Fetching escalated complaints for user:', user?.email, 'Role:', user?.role, 'ID:', user?.id)
      
      // Use appropriate endpoint based on user role
      let response;
      let data = []
      
      if (user?.role === 'SENIOR_EMPLOYEE') {
        // SENIOR_EMPLOYEE should see ONLY complaints escalated to them
        console.log('🔍 Senior employee: Fetching ONLY my escalated complaints')
        
        // First try to get all escalated complaints
        const allResponse = await seniorAPI.getAllEscalatedComplaints()
        console.log('📊 All escalated complaints received:', allResponse)
        
        // Handle different response formats
        if (allResponse && allResponse.success && Array.isArray(allResponse.data)) {
          data = allResponse.data
        } else if (Array.isArray(allResponse)) {
          data = allResponse
        } else if (allResponse && allResponse.data && Array.isArray(allResponse.data)) {
          data = allResponse.data
        }
        
        console.log('📈 Total escalated complaints in system:', data.length)
        
        // FILTER: Only keep complaints escalated to the current senior employee
        const myComplaints = data.filter(complaint => {
          const isMine = complaint.escalatedToId === user?.id
          console.log(`Complaint ${complaint.id}: escalatedToId=${complaint.escalatedToId}, myId=${user?.id}, isMine=${isMine}`)
          return isMine
        })
        
        console.log('✅ Complaints escalated to ME:', myComplaints.length)
        data = myComplaints
        
        // Create response object for consistency
        response = {
          success: true,
          data: data,
          message: `Found ${data.length} complaints escalated to you`
        }
        
      } else if (user?.role === 'ADMIN') {
        // ADMIN can see ALL escalated complaints
        console.log('👑 Admin: Fetching ALL escalated complaints')
        response = await seniorAPI.getAllEscalatedComplaints()
        
        if (response && response.success && Array.isArray(response.data)) {
          data = response.data
        } else if (Array.isArray(response)) {
          data = response
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data
        }
        
      } else {
        // Regular employees see only complaints escalated to them
        console.log('👤 Regular employee: Fetching my escalated complaints')
        response = await complaintAPI.getEscalatedComplaints()
        
        if (response && response.success && Array.isArray(response.data)) {
          data = response.data
        } else if (Array.isArray(response)) {
          data = response
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data
        }
      }
      
      console.log('✅ Final data to display:', data.length, 'complaints')
      
      // Filter to show only actual escalated complaints (just in case)
      const escalatedComplaints = data.filter(complaint => {
        const isEscalated = complaint.escalatedToId !== null && complaint.escalatedToId !== undefined
        return isEscalated
      })
      
      console.log('📊 Actual escalated complaints after filtering:', escalatedComplaints.length)
      
      setComplaints(escalatedComplaints)
      
      // Calculate comprehensive stats
      const total = escalatedComplaints.length
      const underReview = escalatedComplaints.filter(c => c.status === 'UNDER_REVIEW').length
      const resolved = escalatedComplaints.filter(c => c.status === 'RESOLVED').length
      const highPriority = escalatedComplaints.filter(c => c.urgency === 'HIGH').length
      
      // Calculate average days since escalation
      let totalDays = 0
      let count = 0
      escalatedComplaints.forEach(c => {
        if (c.escalationDate) {
          try {
            const escalationDate = new Date(c.escalationDate)
            if (!isNaN(escalationDate.getTime())) {
              const now = new Date()
              const days = Math.floor((now - escalationDate) / (1000 * 60 * 60 * 24))
              totalDays += days
              count++
            }
          } catch (e) {
            console.warn('Invalid date for complaint', c.id, c.escalationDate)
          }
        }
      })
      
      const averageDays = count > 0 ? Math.round(totalDays / count) : 0
      
      setStats({
        total,
        underReview,
        resolved,
        averageDays,
        highPriority
      })
      
      console.log('📈 Stats calculated for', user?.role, ':', {
        total,
        underReview,
        resolved,
        averageDays,
        highPriority,
        userId: user?.id
      })
      
    } catch (err) {
      console.error('❌ Failed to fetch escalated complaints:', err)
      setError(err.message || 'Failed to load escalated complaints. Please try again.')
      setComplaints([])
    } finally {
      setLoading(false)
    }
  }

  const fetchLoadStats = async () => {
    try {
      console.log('📤 Fetching load distribution stats')
      const response = await seniorAPI.getLoadDistribution()
      console.log('✅ Load distribution response:', response)
      
      if (response.success) {
        setLoadStats(response.data)
      } else {
        console.error('Failed to fetch load stats:', response.error)
      }
    } catch (err) {
      console.error('Failed to fetch load stats:', err)
    }
  }

  const handleStatusUpdate = async (complaintId, newStatus) => {
    if (!window.confirm(`Change status to "${newStatus.replace('_', ' ')}"?`)) {
      return
    }
    
    setUpdating(prev => ({ ...prev, [complaintId]: true }))
    
    try {
      console.log(`📤 Updating complaint ${complaintId} status to ${newStatus}`)
      
      // Use the main complaint API endpoint that works for all users
      const response = await complaintAPI.updateComplaintStatus(complaintId, newStatus)
      console.log('✅ Status update response:', response)
      
      if (response.success) {
        // Update local state
        setComplaints(prev => 
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
        
        alert('✅ Status updated successfully!')
        fetchEscalatedComplaints() // Refresh data
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

  const handleDeescalate = async (complaintId, complaintTitle) => {
    const reason = window.prompt(`Please provide a reason for de-escalating complaint "${complaintTitle}":`)
    if (reason === null) return
    
    if (!window.confirm(`Are you sure you want to de-escalate "${complaintTitle}"?\n\nIt will be reassigned to the original employee or remain unassigned.`)) {
      return
    }
    
    setUpdating(prev => ({ ...prev, [complaintId]: true }))
    
    try {
      console.log(`📤 De-escalating complaint ${complaintId}`)
      
      // Use the senior API for de-escalation
      const response = await seniorAPI.deescalateComplaint(complaintId, reason)
      console.log('✅ De-escalation response:', response)
      
      if (response.success) {
        // Update local state - mark as de-escalated
        setComplaints(prev => 
          prev.map(complaint => 
            complaint.id === complaintId 
              ? { 
                  ...complaint, 
                  escalatedToId: null,
                  escalatedToName: null,
                  escalationReason: complaint.escalationReason + ' [DE-ESCALATED]'
                }
              : complaint
          )
        )
        
        alert('✅ Complaint de-escalated successfully!')
        fetchEscalatedComplaints() // Refresh data
        if (user?.role === 'SENIOR_EMPLOYEE' || user?.role === 'ADMIN') {
          fetchLoadStats() // Refresh load stats
        }
      } else {
        throw new Error(response.error || 'Failed to de-escalate')
      }
    } catch (err) {
      console.error('❌ Failed to de-escalate:', err)
      alert(`❌ Failed to de-escalate complaint: ${err.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [complaintId]: false }))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    
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

  const getStatusBadge = (status) => {
    const statusMap = {
      'NEW': { 
        label: 'New', 
        className: 'badge bg-info', 
        icon: '🆕',
        color: 'info'
      },
      'UNDER_REVIEW': { 
        label: 'Under Review', 
        className: 'badge bg-warning', 
        icon: '🔍',
        color: 'warning'
      },
      'RESOLVED': { 
        label: 'Resolved', 
        className: 'badge bg-success', 
        icon: '✅',
        color: 'success'
      }
    }
    return statusMap[status] || { 
      label: status || 'Unknown', 
      className: 'badge bg-secondary', 
      icon: '❓',
      color: 'secondary'
    }
  }

  const getUrgencyBadge = (urgency) => {
    const urgencyMap = {
      'HIGH': { 
        label: 'High',
        className: 'badge bg-danger', 
        icon: '🔥',
        color: 'danger'
      },
      'MEDIUM': { 
        label: 'Medium',
        className: 'badge bg-warning', 
        icon: '⚠️',
        color: 'warning'
      },
      'NORMAL': { 
        label: 'Normal',
        className: 'badge bg-info', 
        icon: '📊',
        color: 'info'
      },
      'LOW': { 
        label: 'Low',
        className: 'badge bg-secondary', 
        icon: '📉',
        color: 'secondary'
      }
    }
    return urgencyMap[urgency] || { 
      label: urgency || 'Unknown',
      className: 'badge bg-secondary', 
      icon: '',
      color: 'secondary'
    }
  }

  const getDaysSinceEscalation = (escalationDate) => {
    if (!escalationDate) return 'Not escalated'
    
    try {
      const date = new Date(escalationDate)
      if (isNaN(date.getTime())) return 'Invalid date'
      
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'Escalated today'
      if (diffDays === 1) return 'Escalated yesterday'
      return `Escalated ${diffDays} days ago`
    } catch (error) {
      return 'Date error'
    }
  }

  const getFilteredComplaints = () => {
    let filtered = [...complaints]
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter)
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        (c.title && c.title.toLowerCase().includes(term)) ||
        (c.description && c.description.toLowerCase().includes(term)) ||
        (c.category && c.category.toLowerCase().includes(term)) ||
        (c.escalationReason && c.escalationReason.toLowerCase().includes(term)) ||
        (c.escalatedToName && c.escalatedToName.toLowerCase().includes(term))
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          const dateA = a.escalationDate || a.createdAt
          const dateB = b.escalationDate || b.createdAt
          return new Date(dateB) - new Date(dateA)
        case 'oldest':
          const dateAOld = a.escalationDate || a.createdAt
          const dateBOld = b.escalationDate || b.createdAt
          return new Date(dateAOld) - new Date(dateBOld)
        case 'urgent':
          const urgencyOrder = { HIGH: 3, MEDIUM: 2, NORMAL: 1, LOW: 0 }
          return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0)
        case 'status':
          const statusOrder = { UNDER_REVIEW: 2, NEW: 1, RESOLVED: 0 }
          return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0)
        default:
          return 0
      }
    })
    
    return filtered
  }

  const clearFilters = () => {
    setFilter('all')
    setSortBy('recent')
    setSearchTerm('')
  }

  const exportToCSV = () => {
    if (complaints.length === 0) {
      alert('No data to export')
      return
    }
    
    const headers = ['ID', 'Title', 'Category', 'Status', 'Urgency', 'Escalated To', 'Escalation Date', 'Escalation Reason', 'Days Since Escalation']
    
    const csvData = complaints.map(c => [
      c.id,
      `"${c.title}"`,
      c.category,
      c.status,
      c.urgency,
      c.escalatedToName || 'Not assigned',
      formatDate(c.escalationDate),
      `"${c.escalationReason || 'No reason provided'}"`,
      getDaysSinceEscalation(c.escalationDate).replace('Escalated ', '')
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `my_escalated_complaints_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading escalated complaints...</p>
        <small className="text-muted">Fetching data for {user?.fullName} ({user?.role})</small>
      </div>
    )
  }

  const filteredComplaints = getFilteredComplaints()
  const hasFilters = filter !== 'all' || sortBy !== 'recent' || searchTerm.trim()
  const isSeniorOrAdmin = user?.role === 'SENIOR_EMPLOYEE' || user?.role === 'ADMIN'
  const isAdminOnly = user?.role === 'ADMIN'

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">
            <FaArrowUp className="me-2 text-warning" />
            {isSeniorOrAdmin ? 'My Escalated Complaints' : 'Escalated Complaints'}
            <span className="badge bg-info ms-2">
              {isAdminOnly ? 'Admin View (All)' : 
               isSeniorOrAdmin ? 'My Senior Complaints' : 'Employee View'}
            </span>
          </h1>
          <p className="text-muted mb-0">
            {isAdminOnly 
              ? 'All escalated complaints in the system' 
              : isSeniorOrAdmin 
                ? 'Complaints escalated specifically to you for senior-level resolution'
                : 'Complaints escalated to you for priority resolution'}
          </p>
          <div className="d-flex align-items-center gap-2 mt-1">
            <small className="text-muted">
              <FaUser className="me-1" /> {user?.fullName}
            </small>
            <span className="badge bg-secondary">{user?.role?.replace('_', ' ')}</span>
            <small className="text-muted">
              ID: {user?.id}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-success"
            onClick={exportToCSV}
            disabled={complaints.length === 0}
          >
            <FaDownload className="me-2" />
            Export CSV
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={fetchEscalatedComplaints}
            disabled={loading}
          >
            <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link 
            to={isSeniorOrAdmin ? '/senior/dashboard' : '/employee/dashboard'} 
            className="btn btn-outline-secondary"
          >
            <FaArrowUp className="me-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <div className="flex-grow-1">
              <strong>Error Loading Data:</strong> {error}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Load Distribution Stats for Senior/Admin */}
      {isSeniorOrAdmin && loadStats && (
        <div className="card mb-4">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">
              <FaChartBar className="me-2" />
              Senior Employee Load Distribution
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3 mb-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <div className="h4 mb-1">{loadStats.totalSeniorEmployees || 0}</div>
                    <small className="text-muted">Total Senior Employees</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <div className="h4 mb-1">{loadStats.totalEscalatedComplaints || 0}</div>
                    <small className="text-muted">Total Escalated System-wide</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <div className="h4 mb-1">{loadStats.escalationThresholdMinutes || 7}</div>
                    <small className="text-muted">Escalation Threshold (minutes)</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <div className="h4 mb-1">{complaints.length}</div>
                    <small className="text-muted">
                      {isAdminOnly ? 'All Escalated' : 'My Escalated Complaints'}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {loadStats.seniorEmployees && loadStats.seniorEmployees.length > 0 && (
              <div className="mt-3">
                <h6>Load by Senior Employee:</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Escalated</th>
                        <th>Assigned</th>
                        <th>Total Load</th>
                        <th>Resolution Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadStats.seniorEmployees.map((se, index) => (
                        <tr key={index} className={se.email === user?.email ? 'table-info fw-bold' : ''}>
                          <td>
                            <div>
                              <strong>{se.name}</strong>
                              {se.email === user?.email && <span className="badge bg-primary ms-2">YOU</span>}
                              <br />
                              <small className="text-muted">{se.email}</small>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-warning">{se.escalatedCount || 0}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{se.assignedCount || 0}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              (se.totalLoad || 0) > 10 ? 'bg-danger' : 
                              (se.totalLoad || 0) > 5 ? 'bg-warning' : 'bg-success'
                            }`}>
                              {se.totalLoad || 0}
                            </span>
                          </td>
                          <td>
                            <div className="progress" style={{ height: '20px' }}>
                              <div 
                                className={`progress-bar ${
                                  (se.resolutionRate || 0) > 80 ? 'bg-success' :
                                  (se.resolutionRate || 0) > 60 ? 'bg-warning' : 'bg-danger'
                                }`}
                                style={{ width: `${Math.min(se.resolutionRate || 0, 100)}%` }}
                              >
                                {Math.round(se.resolutionRate || 0)}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info mt-3 mb-0">
                  <FaInfoCircle className="me-2" />
                  <strong>Note:</strong> You are viewing only <strong>your own escalated complaints</strong> ({complaints.length}). 
                  System-wide there are {loadStats.totalEscalatedComplaints || 0} escalated complaints distributed among {loadStats.totalSeniorEmployees || 0} senior employees.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">
                    {isAdminOnly ? 'Total Escalated' : 'My Escalated'}
                  </div>
                  <div className="h2 mb-0 text-warning">{stats.total}</div>
                  <div className="small text-muted">
                    {stats.underReview} under review
                  </div>
                </div>
                <div className="ms-3">
                  <FaArrowUp className="fa-2x text-warning opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-muted small text-uppercase fw-bold">Under Review</div>
                  <div className="h2 mb-0 text-primary">{stats.underReview}</div>
                  <div className="small text-muted">
                    {Math.round((stats.underReview / stats.total) * 100) || 0}% of my total
                  </div>
                </div>
                <div className="ms-3">
                  <FaClock className="fa-2x text-primary opacity-50" />
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
                  <div className="text-muted small text-uppercase fw-bold">Resolved</div>
                  <div className="h2 mb-0 text-success">{stats.resolved}</div>
                  <div className="small text-muted">
                    {Math.round((stats.resolved / stats.total) * 100) || 0}% resolution rate
                  </div>
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
                  <div className="text-muted small text-uppercase fw-bold">Avg. Days Escalated</div>
                  <div className="h2 mb-0 text-danger">{stats.averageDays}</div>
                  <div className="small text-muted">
                    {stats.highPriority} high priority
                  </div>
                </div>
                <div className="ms-3">
                  <FaChartBar className="fa-2x text-danger opacity-50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filter & Sort {isAdminOnly ? '(All Complaints)' : '(My Complaints)'}
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-bold">
                <FaFilter className="me-2" />
                Filter by Status
              </label>
              <select 
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <label className="form-label fw-bold">
                <FaSort className="me-2" />
                Sort By
              </label>
              <select 
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Most Recently Escalated</option>
                <option value="oldest">Oldest Escalated</option>
                <option value="urgent">Most Urgent</option>
                <option value="status">Status (Review → New → Resolved)</option>
              </select>
            </div>
            
            <div className="col-md-3">
              <label className="form-label fw-bold">
                <FaSearch className="me-2" />
                Search Complaints
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by title, description, category..."
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
            
            <div className="col-md-3">
              <label className="form-label fw-bold">
                <FaUsers className="me-2" />
                Quick Actions
              </label>
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-info"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                >
                  <FaTimes className="me-2" />
                  Clear Filters
                </button>
                {isSeniorOrAdmin && (
                  <button 
                    className="btn btn-outline-warning"
                    onClick={fetchLoadStats}
                  >
                    <FaChartBar className="me-2" />
                    Refresh Load Stats
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {hasFilters && (
            <div className="row mt-3">
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <FaBullhorn className="me-2" />
                      Showing <strong>{filteredComplaints.length}</strong> of <strong>{complaints.length}</strong> 
                      {isAdminOnly ? ' escalated complaints' : ' complaints escalated to me'}
                      {hasFilters && ' (filtered)'}
                    </div>
                    <div>
                      <button 
                        className="btn btn-sm btn-outline-info"
                        onClick={clearFilters}
                      >
                        <FaTimes className="me-1" />
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="card shadow">
        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <FaShieldAlt className="me-2" />
              {isAdminOnly ? 'All Escalated Complaints' : 'My Escalated Complaints'} Management
              <span className="badge bg-dark ms-2">{complaints.length} total</span>
            </h5>
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString()} | 
              Viewing: {isAdminOnly ? 'ALL escalated complaints' : 'ONLY complaints escalated to me'}
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark">
              <FaUserTie className="me-1" />
              {user?.role?.replace('_', ' ')}: {user?.fullName}
            </span>
            {isSeniorOrAdmin && loadStats && (
              <span className="badge bg-info">
                Threshold: {loadStats.escalationThresholdMinutes} minutes
              </span>
            )}
          </div>
        </div>
        
        <div className="card-body p-0">
          {complaints.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-4">
                <FaArrowUp className="display-1 text-muted opacity-50" />
              </div>
              <h4 className="text-muted">No Escalated Complaints Found</h4>
              <p className="text-muted mb-4">
                {isAdminOnly 
                  ? 'There are currently no escalated complaints in the system.'
                  : 'No complaints have been escalated to you yet. Complaints will appear here when they are automatically escalated after being unresolved or unassigned.'}
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button 
                  className="btn btn-primary"
                  onClick={fetchEscalatedComplaints}
                  disabled={loading}
                >
                  <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
                  Check Again
                </button>
                <Link 
                  to={isSeniorOrAdmin ? '/senior/dashboard' : '/employee/dashboard'} 
                  className="btn btn-outline-primary"
                >
                  <FaArrowUp className="me-2" />
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="text-center py-5">
              <FaFilter className="display-1 text-muted mb-3" />
              <h4>No Matching Complaints</h4>
              <p className="text-muted mb-4">
                No escalated complaints match your current filters. Try adjusting your search criteria.
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
                    <th style={{ width: '80px' }}>ID</th>
                    <th>Complaint Details</th>
                    <th style={{ width: '180px' }}>Escalation Info</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '100px' }}>Urgency</th>
                    <th style={{ width: '220px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map(complaint => {
                    const status = getStatusBadge(complaint.status)
                    const urgency = getUrgencyBadge(complaint.urgency)
                    const isEscalatedToMe = complaint.escalatedToId === user?.id
                    
                    return (
                      <tr key={complaint.id} className={complaint.status === 'UNDER_REVIEW' ? 'table-warning' : ''}>
                        <td className="align-middle">
                          <span className="badge bg-dark">#{complaint.id}</span>
                        </td>
                        <td className="align-middle">
                          <div>
                            <div className="fw-bold mb-1">{complaint.title}</div>
                            <div className="small text-muted mb-2">
                              {complaint.description?.length > 80 
                                ? `${complaint.description.substring(0, 80)}...`
                                : complaint.description || 'No description'}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                              <span className="badge bg-secondary">
                                <FaTag className="me-1" size="10" />
                                {complaint.category || 'Uncategorized'}
                              </span>
                              {complaint.anonymous && (
                                <span className="badge bg-dark">
                                  <FaUser className="me-1" size="10" />
                                  Anonymous
                                </span>
                              )}
                              {(complaint.attachmentCount > 0) && (
                                <span className="badge bg-info">
                                  <FaPaperclip className="me-1" size="10" />
                                  {complaint.attachmentCount} files
                                </span>
                              )}
                              {(complaint.commentCount > 0) && (
                                <span className="badge bg-primary">
                                  <FaComment className="me-1" size="10" />
                                  {complaint.commentCount}
                                </span>
                              )}
                              {(complaint.likeCount > 0) && (
                                <span className="badge bg-danger">
                                  <FaHeart className="me-1" size="10" />
                                  {complaint.likeCount}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 small text-muted">
                              <FaUser className="me-1" size="10" />
                              Submitted by: {complaint.anonymous ? 'Anonymous' : complaint.userFullName || 'Unknown'}
                              {complaint.daysSinceCreation > 0 && (
                                <span className="ms-3">
                                  <FaHistory className="me-1" size="10" />
                                  {complaint.daysSinceCreation} days open
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="small">
                            <div className="mb-2">
                              <FaArrowUp className={`me-1 text-${urgency.color}`} size="12" />
                              <strong>Escalated to:</strong>
                              <div className="mt-1">
                                {complaint.escalatedToName ? (
                                  <span className={`badge ${isEscalatedToMe ? 'bg-success' : 'bg-info'}`}>
                                    <FaCrown className="me-1" size="10" />
                                    {complaint.escalatedToName}
                                    {isEscalatedToMe && ' (Me)'}
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary">Not assigned</span>
                                )}
                              </div>
                            </div>
                            <div className="mb-1">
                              <FaCalendar className="me-1 text-muted" size="10" />
                              {formatDate(complaint.escalationDate)}
                            </div>
                            {complaint.escalationReason && (
                              <div className="mb-1">
                                <small className="text-muted">
                                  <FaCommentDots className="me-1" size="10" />
                                  {complaint.escalationReason.length > 60 
                                    ? `${complaint.escalationReason.substring(0, 60)}...`
                                    : complaint.escalationReason}
                                </small>
                              </div>
                            )}
                            <div className="mt-2">
                              <small className="text-muted">
                                <FaClock className="me-1" size="10" />
                                {getDaysSinceEscalation(complaint.escalationDate)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${status.className} p-2 d-inline-flex align-items-center`}>
                            {status.icon} {status.label}
                          </span>
                          {complaint.requiresEscalation && (
                            <div className="mt-1">
                              <small className="badge bg-danger">
                                <FaFlag className="me-1" size="8" />
                                Requires Attention
                              </small>
                            </div>
                          )}
                        </td>
                        <td className="align-middle">
                          <span className={`badge ${urgency.className} p-2 d-inline-flex align-items-center`}>
                            {urgency.icon} {urgency.label}
                          </span>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex flex-column gap-2">
                            <div className="btn-group btn-group-sm">
                              <Link
                                to={`/complaints/${complaint.id}`}
                                className="btn btn-outline-primary"
                                title="View Details"
                              >
                                <FaEye />
                              </Link>
                              
                              {(isEscalatedToMe || user?.role === 'ADMIN') && complaint.status !== 'RESOLVED' && (
                                <button
                                  className="btn btn-outline-success"
                                  onClick={() => handleStatusUpdate(complaint.id, 'RESOLVED')}
                                  disabled={updating[complaint.id]}
                                  title="Mark as Resolved"
                                >
                                  {updating[complaint.id] ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <FaCheckCircle />
                                  )}
                                </button>
                              )}
                              
                              {isSeniorOrAdmin && isEscalatedToMe && complaint.escalatedToId && (
                                <button
                                  className="btn btn-outline-warning"
                                  onClick={() => handleDeescalate(complaint.id, complaint.title)}
                                  disabled={updating[complaint.id]}
                                  title="De-escalate (Return to Regular Employee)"
                                >
                                  {updating[complaint.id] ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <FaArrowUp className="rotate-180" />
                                  )}
                                </button>
                              )}
                            </div>
                            
                            <div className="btn-group btn-group-sm w-100">
                              {(isEscalatedToMe || user?.role === 'ADMIN') && (
                                <button
                                  className={`btn btn-sm ${complaint.status === 'UNDER_REVIEW' ? 'btn-warning' : 'btn-outline-warning'} flex-fill`}
                                  onClick={() => handleStatusUpdate(complaint.id, 'UNDER_REVIEW')}
                                  disabled={updating[complaint.id] || complaint.status === 'UNDER_REVIEW'}
                                >
                                  {updating[complaint.id] ? (
                                    <FaSpinner className="fa-spin" />
                                  ) : (
                                    'Review'
                                  )}
                                </button>
                              )}
                              {(isEscalatedToMe || user?.role === 'ADMIN') && (
                                <button
                                  className={`btn btn-sm ${complaint.status === 'RESOLVED' ? 'btn-success' : 'btn-outline-success'} flex-fill`}
                                  onClick={() => handleStatusUpdate(complaint.id, 'RESOLVED')}
                                  disabled={updating[complaint.id] || complaint.status === 'RESOLVED'}
                                >
                                  {updating[complaint.id] ? (
                                    <FaSpinner className="fa-spin" />
                                  ) : (
                                    'Resolve'
                                  )}
                                </button>
                              )}
                            </div>
                            
                            <div className="d-grid">
                              <Link
                                to={`/complaints/${complaint.id}#comments`}
                                className="btn btn-sm btn-outline-info"
                              >
                                <FaComment className="me-1" />
                                Add Comment
                              </Link>
                            </div>
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
                Showing {filteredComplaints.length} of {complaints.length} 
                {isAdminOnly ? ' escalated complaints' : ' complaints escalated to me'}
                {hasFilters && ' (filtered)'}
              </small>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={fetchEscalatedComplaints}
                disabled={loading}
              >
                <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Information Alert */}
      <div className="alert alert-warning mt-4">
        <div className="d-flex align-items-center">
          <FaBullhorn className="me-3 fs-4" />
          <div>
            <h6 className="alert-heading mb-2">
              <FaArrowUp className="me-2" />
              About Escalated Complaints
            </h6>
            <p className="mb-2">
              Complaints are automatically escalated when they meet these criteria:
            </p>
            <ul className="mb-2">
              <li>Remain unassigned for more than <strong>{loadStats?.escalationThresholdMinutes || 7} minutes</strong> (7 days in production)</li>
              <li>Are assigned but unresolved for more than <strong>{loadStats?.escalationThresholdMinutes || 7} minutes</strong></li>
              <li>Require specialized attention or senior-level expertise</li>
              <li>Have high urgency or complexity</li>
            </ul>
            <p className="mb-0">
              <strong>Your Role ({user?.role?.replace('_', ' ')})</strong>: {
                isAdminOnly 
                  ? 'You can view and manage ALL escalated complaints in the system.'
                  : isSeniorOrAdmin 
                    ? 'You can view and manage ONLY complaints escalated specifically to you. You can de-escalate complaints assigned to you.'
                    : 'You can view and manage complaints escalated specifically to you.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EscalatedComplaints