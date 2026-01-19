import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { complaintAPI } from '../services/api'
import { FaEye, FaPlusCircle, FaSync, FaCalendar, FaClock, FaHeart, FaUserCheck, FaTag, FaIdCard, FaPaperclip, FaLightbulb, FaInbox, FaExclamationTriangle } from 'react-icons/fa'
import './MyComplaints.css';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchComplaints()
  }, [])

  const fetchComplaints = async () => {
    try {
      setLoading(true)
      const response = await complaintAPI.getMyComplaints()
      
      let complaintsData = []
      
      if (Array.isArray(response)) {
        complaintsData = response
      } else if (response && Array.isArray(response.data)) {
        complaintsData = response.data
      } else if (response && typeof response === 'object' && response.data) {
        complaintsData = [response.data]
      }
      
      const filteredComplaints = complaintsData.filter(complaint => 
        complaint.userId !== null && complaint.userId !== undefined
      )
      
      setComplaints(filteredComplaints)
      setError('')
      
    } catch (err) {
      if (err.status === 401) {
        setError('Your session has expired. Please login again.')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        setError(`Failed to fetch complaints: ${err.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
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
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return { class: 'status-unknown', label: 'Unknown' }
    
    const statusMap = {
      'NEW': { class: 'status-new', label: 'New', icon: '🆕' },
      'UNDER_REVIEW': { class: 'status-review', label: 'Under Review', icon: '🔍' },
      'RESOLVED': { class: 'status-resolved', label: 'Resolved', icon: '✅' },
      'IN_PROGRESS': { class: 'status-progress', label: 'In Progress', icon: '⚡' }
    }
    
    return statusMap[status.toUpperCase()] || { class: 'status-unknown', label: status }
  }

  const getUrgencyBadge = (urgency) => {
    if (!urgency) return { class: 'urgency-none', label: 'Normal' }
    
    const urgencyMap = {
      'HIGH': { class: 'urgency-high', label: 'High', icon: '🔥' },
      'MEDIUM': { class: 'urgency-medium', label: 'Medium', icon: '⚠️' },
      'LOW': { class: 'urgency-low', label: 'Low', icon: '⏳' },
      'NORMAL': { class: 'urgency-normal', label: 'Normal', icon: '📊' }
    }
    
    return urgencyMap[urgency.toUpperCase()] || { class: 'urgency-none', label: urgency }
  }

  if (loading) {
    return (
      <div className="my-complaints-container">
        <div className="loading-overlay">
          <div className="spinner-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="loading-text mt-3">
              <h4>Loading Your Complaints</h4>
              <p className="text-muted">Fetching your submitted issues...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-complaints-container">
      {/* Header Section */}
      <div className="header-section mb-5">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h1 className="display-5 fw-bold mb-3">
              My <span className="text-gradient">Complaints</span>
            </h1>
            <p className="lead text-muted mb-0">
              Track and manage complaints you've submitted
            </p>
          </div>
          <div className="col-md-4 text-md-end">
            <Link to="/submit" className="btn btn-primary btn-lg px-4">
              <FaPlusCircle className="me-2" />
              New Complaint
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="stats-card">
            <div className="row">
              <div className="col-md-4 col-6 mb-3 mb-md-0">
                <div className="stat-item">
                  <div className="stat-icon total">
                    <FaInbox />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{complaints.length}</div>
                    <div className="stat-label">Total Complaints</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-6 mb-3 mb-md-0">
                <div className="stat-item">
                  <div className="stat-icon resolved">
                    <FaTag />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {complaints.filter(c => c.status === 'RESOLVED').length}
                    </div>
                    <div className="stat-label">Resolved</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-12">
                <div className="stat-item">
                  <div className="stat-icon pending">
                    <FaClock />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'IN_PROGRESS').length}
                    </div>
                    <div className="stat-label">In Progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger alert-dismissible fade show animate__animated animate__shakeX" role="alert">
              <div className="d-flex align-items-center">
                <FaExclamationTriangle className="me-3 flex-shrink-0" />
                <div className="flex-grow-1">{error}</div>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setError('')}
                ></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaints Grid */}
      {!loading && complaints.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FaInbox />
          </div>
          <h3>No Complaints Yet</h3>
          <p className="text-muted mb-4">
            Submit your first non-anonymous complaint to get started
          </p>
          <div className="d-flex gap-3 justify-content-center">
            <Link to="/submit" className="btn btn-primary">
              <FaPlusCircle className="me-2" />
              Submit Complaint
            </Link>
            <button className="btn btn-outline-primary" onClick={fetchComplaints}>
              <FaSync className="me-2" />
              Check Again
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {complaints.map((complaint, index) => {
            const status = getStatusBadge(complaint.status)
            const urgency = getUrgencyBadge(complaint.urgency)
            
            return (
              <div key={complaint.id || index} className="col-xl-6 col-lg-12 mb-4">
                <div className="complaint-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className={`status-badge ${status.class}`}>
                          {status.icon} {status.label}
                        </span>
                        <span className={`urgency-badge ${urgency.class} ms-2`}>
                          {urgency.icon} {urgency.label}
                        </span>
                      </div>
                      <div className="complaint-meta">
                        <FaCalendar className="me-1" />
                        <small>{formatDate(complaint.createdAt)}</small>
                      </div>
                    </div>
                    
                    <h3 className="complaint-title">
                      {complaint.title || 'Untitled Complaint'}
                    </h3>
                    
                    <div className="category-badge">
                      <FaTag className="me-2" />
                      {complaint.category || 'General'}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <p className="complaint-description">
                      {complaint.description ? 
                        (complaint.description.length > 200
                          ? `${complaint.description.substring(0, 200)}...`
                          : complaint.description)
                        : 'No description provided'}
                    </p>
                    
                    <div className="info-grid">
                      <div className="info-item">
                        <FaIdCard className="me-2" />
                        <small>ID: <strong>#{complaint.id || 'N/A'}</strong></small>
                      </div>
                      
                      {complaint.likeCount > 0 && (
                        <div className="info-item">
                          <FaHeart className="me-2 text-danger" />
                          <small>{complaint.likeCount} like{complaint.likeCount !== 1 ? 's' : ''}</small>
                        </div>
                      )}
                      
                      {complaint.attachmentCount > 0 && (
                        <div className="info-item">
                          <FaPaperclip className="me-2" />
                          <small>{complaint.attachmentCount} attachment{complaint.attachmentCount !== 1 ? 's' : ''}</small>
                        </div>
                      )}
                    </div>
                    
                    {complaint.assignedEmployee && complaint.assignedEmployeeName && (
                      <div className="assigned-employee">
                        <FaUserCheck className="me-2" />
                        <div>
                          <small className="d-block">Assigned to</small>
                          <strong>{complaint.assignedEmployeeName}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="card-footer">
                    <div className="footer-content">
                      <div className="date-info">
                        <small className="text-muted">
                          Updated: {formatDate(complaint.updatedAt)}
                        </small>
                      </div>
                      
                      <Link 
                        to={`/complaints/${complaint.id}`}
                        className="view-details-btn"
                      >
                        <FaEye className="me-2" />
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Refresh Section */}
      {complaints.length > 0 && (
        <div className="row mt-5">
          <div className="col-12">
            <div className="refresh-section text-center">
              <div className="refresh-card">
                <h5 className="mb-3">
                  <FaLightbulb className="me-2 text-warning" />
                  Showing <span className="text-primary">{complaints.length}</span> non-anonymous complaint{complaints.length !== 1 ? 's' : ''}
                </h5>
                <button 
                  className="btn btn-gradient me-3"
                  onClick={fetchComplaints}
                  disabled={loading}
                >
                  <FaSync className={`me-2 ${loading ? 'spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh List'}
                </button>
                <Link to="/submit" className="btn btn-outline-primary">
                  <FaPlusCircle className="me-2" />
                  Add New
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyComplaints