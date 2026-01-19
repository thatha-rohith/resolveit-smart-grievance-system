import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { complaintAPI, likeAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FaHeart, FaRegHeart, FaEye, FaComment, FaPaperclip, FaUser, FaCalendar, FaFire, FaSyncAlt, FaInbox, FaExclamationTriangle, FaInfoCircle, FaArrowUp, FaFilter, FaSort, FaCheckCircle, FaClock, FaList } from 'react-icons/fa'
import './PublicComplaints.css';

const PublicComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liking, setLiking] = useState({})
  const [likeStatuses, setLikeStatuses] = useState({})
  const { isAuthenticated, user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchComplaints()
  }, [filter, sortBy])

  useEffect(() => {
    if (complaints.length > 0) {
      fetchLikeStatuses()
    }
  }, [complaints])

  const fetchComplaints = async () => {
    try {
      setLoading(true)
      const response = await complaintAPI.getPublicComplaints()
      
      let data = Array.isArray(response) ? response : 
                (response && Array.isArray(response.data) ? response.data : [])
      
      // Apply filters
      if (filter !== 'all') {
        data = data.filter(complaint => complaint.status === filter)
      }
      
      // Apply sorting
      data.sort((a, b) => {
        switch(sortBy) {
          case 'newest':
            return new Date(b.createdAt) - new Date(a.createdAt)
          case 'oldest':
            return new Date(a.createdAt) - new Date(b.createdAt)
          case 'most-liked':
            return (b.likeCount || 0) - (a.likeCount || 0)
          case 'most-commented':
            return (b.commentCount || 0) - (a.commentCount || 0)
          default:
            return 0
        }
      })
      
      setComplaints(data)
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError('Failed to fetch complaints. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLikeStatuses = async () => {
    try {
      const statuses = {}
      for (const complaint of complaints) {
        try {
          if (isAuthenticated) {
            const data = await likeAPI.getLikeStatus(complaint.id)
            statuses[complaint.id] = data.hasLiked || false
          }
        } catch (err) {
          statuses[complaint.id] = false
        }
      }
      setLikeStatuses(statuses)
    } catch (err) {
      console.error('Failed to fetch like statuses:', err)
    }
  }

  const handleLike = async (complaintId) => {
    if (!isAuthenticated) {
      setError('Please login to like complaints')
      setTimeout(() => setError(''), 3000)
      return
    }

    setLiking(prev => ({ ...prev, [complaintId]: true }))
    
    try {
      const result = await likeAPI.toggleLike(complaintId)
      
      if (result.error) {
        setError(result.message || 'Failed to like complaint')
        setTimeout(() => setError(''), 3000)
      } else {
        setComplaints(prevComplaints => 
          prevComplaints.map(complaint => {
            if (complaint.id === complaintId) {
              return {
                ...complaint,
                likeCount: result.likeCount || 0
              }
            }
            return complaint
          })
        )
        
        setLikeStatuses(prev => ({
          ...prev,
          [complaintId]: result.liked || false
        }))
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
      setError('Failed to like complaint. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setLiking(prev => ({ ...prev, [complaintId]: false }))
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status) => {
    const config = {
      'NEW': { label: 'New', color: 'blue', icon: <FaFire /> },
      'UNDER_REVIEW': { label: 'Reviewing', color: 'orange', icon: <FaEye /> },
      'RESOLVED': { label: 'Resolved', color: 'green', icon: <FaCheckCircle /> },
      'IN_PROGRESS': { label: 'In Progress', color: 'purple', icon: <FaSyncAlt /> }
    }
    return config[status] || { label: status, color: 'gray', icon: <FaInfoCircle /> }
  }

  const getUrgencyColor = (urgency) => {
    const map = { 'HIGH': 'red', 'MEDIUM': 'yellow', 'LOW': 'gray' }
    return map[urgency] || 'gray'
  }

  if (loading) {
    return (
      <div className="saas-loader-wrapper">
        <div className="saas-loader"></div>
        <p>Loading Ticket Data...</p>
      </div>
    )
  }

  return (
    <div className="saas-dashboard">
      {/* Top Navigation Bar */}
      <header className="saas-header">
        <div className="header-left">
          <div className="brand-icon"><FaInbox /></div>
          <div>
            <h1>Public Resolution Center</h1>
            <span className="subtitle">Enterprise Complaint Management System</span>
          </div>
        </div>
        <div className="header-right">
          <Link to="/submit" className="saas-btn primary">
            <FaArrowUp /> Create Ticket
          </Link>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="saas-layout">
        
        {/* Left Sidebar - Filters */}
        <aside className="saas-sidebar">
          <div className="sidebar-section">
            <h3>Overview</h3>
            <div className="kpi-mini">
              <span className="kpi-label">Total Tickets</span>
              <span className="kpi-value">{complaints.length}</span>
            </div>
            <div className="kpi-mini">
              <span className="kpi-label">Resolved</span>
              <span className="kpi-value">{complaints.filter(c => c.status === 'RESOLVED').length}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Status Filters</h3>
            <nav className="filter-nav">
              <button 
                className={`nav-item ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                <FaList className="nav-icon" /> All Tickets
              </button>
              <button 
                className={`nav-item ${filter === 'NEW' ? 'active' : ''}`}
                onClick={() => setFilter('NEW')}
              >
                <div className="status-dot blue"></div> New
              </button>
              <button 
                className={`nav-item ${filter === 'IN_PROGRESS' ? 'active' : ''}`}
                onClick={() => setFilter('IN_PROGRESS')}
              >
                <div className="status-dot purple"></div> In Progress
              </button>
              <button 
                className={`nav-item ${filter === 'UNDER_REVIEW' ? 'active' : ''}`}
                onClick={() => setFilter('UNDER_REVIEW')}
              >
                <div className="status-dot orange"></div> Reviewing
              </button>
              <button 
                className={`nav-item ${filter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setFilter('RESOLVED')}
              >
                <div className="status-dot green"></div> Resolved
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="saas-content">
          
          {/* Toolbar */}
          <div className="saas-toolbar">
            <div className="toolbar-left">
              <h2>{filter === 'all' ? 'All Tickets' : getStatusConfig(filter).label}</h2>
              <span className="counter-badge">{complaints.length} items</span>
            </div>
            <div className="toolbar-right">
              <div className="select-wrapper">
                <FaSort className="select-icon" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="saas-select"
                >
                  <option value="newest">Date: Newest</option>
                  <option value="oldest">Date: Oldest</option>
                  <option value="most-liked">Popularity</option>
                  <option value="most-commented">Activity</option>
                </select>
              </div>
              <button className="saas-btn icon-only" onClick={fetchComplaints} title="Refresh Data">
                <FaSyncAlt className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="saas-alert error">
              <FaExclamationTriangle /> {error}
              <button onClick={() => setError('')}>&times;</button>
            </div>
          )}

          {/* Ticket List View */}
          <div className="ticket-list">
            {complaints.length === 0 ? (
              <div className="empty-state-saas">
                <div className="empty-icon-circle"><FaInbox /></div>
                <h3>No tickets found</h3>
                <p>There are no complaints matching your current filters.</p>
                <button className="saas-btn outline" onClick={fetchComplaints}>Refresh List</button>
              </div>
            ) : (
              complaints.map(complaint => {
                const status = getStatusConfig(complaint.status);
                const hasLiked = likeStatuses[complaint.id] || false;
                const isLiking = liking[complaint.id] || false;

                return (
                  <div key={complaint.id} className="ticket-row">
                    {/* Status Strip */}
                    <div className={`status-strip ${status.color}`}></div>

                    {/* Main Content */}
                    <div className="ticket-body">
                      <div className="ticket-header">
                        <div className="ticket-id">#{complaint.id.toString().slice(-6)}</div>
                        <div className={`saas-badge ${status.color}`}>
                          {status.icon} {status.label}
                        </div>
                        <div className={`saas-badge outline ${getUrgencyColor(complaint.urgency)}`}>
                          {complaint.urgency} Priority
                        </div>
                        <span className="ticket-category">{complaint.category}</span>
                      </div>

                      <h3 className="ticket-title">
                        <Link to={`/complaints/${complaint.id}`}>
                          {complaint.title}
                        </Link>
                      </h3>

                      <p className="ticket-preview">
                        {complaint.description ? complaint.description.substring(0, 140) + (complaint.description.length > 140 ? '...' : '') : 'No description.'}
                      </p>

                      <div className="ticket-meta-row">
                        <div className="meta-group">
                          <span className="meta-item" title="Author">
                            <FaUser /> {complaint.anonymous ? 'Anonymous' : complaint.userFullName || 'User'}
                          </span>
                          <span className="meta-item" title="Created At">
                            <FaClock /> {formatDate(complaint.createdAt)}
                          </span>
                        </div>

                        <div className="action-group">
                          <button 
                            className={`action-btn ${hasLiked ? 'active' : ''}`}
                            onClick={() => handleLike(complaint.id)}
                            disabled={isLiking}
                          >
                            {isLiking ? <FaSyncAlt className="spin" /> : hasLiked ? <FaHeart /> : <FaRegHeart />}
                            <span>{complaint.likeCount || 0}</span>
                          </button>

                          <div className="stat-pill">
                            <FaComment /> {complaint.commentCount || 0}
                          </div>

                          {complaint.attachmentCount > 0 && (
                            <div className="stat-pill" title="Has Attachments">
                              <FaPaperclip /> {complaint.attachmentCount}
                            </div>
                          )}
                          
                          <Link to={`/complaints/${complaint.id}`} className="saas-btn small">
                            View <FaEye />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default PublicComplaints