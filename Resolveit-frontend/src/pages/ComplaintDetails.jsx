import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { complaintAPI, commentAPI, likeAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FaArrowUp } from 'react-icons/fa'

// Import components
import InternalNotes from '../components/InternalNotes'
import EscalateComplaint from '../components/EscalateComplaint'
import AttachmentDisplay from '../components/AttachmentDisplay'

// Import icons
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaCalendar,
  FaClock,
  FaTag,
  FaEye,
  FaHeart,
  FaComment,
  FaPaperclip,
  FaInfoCircle,
  FaSpinner,
  FaUser,
  FaUserCheck,
  FaGlobe,
  FaUserSecret,
  FaPaperPlane,
  FaSignInAlt,
  FaCheckCircle,
  FaUserPlus,
  FaCog,
  FaSync,
  FaComments,
  FaChartLine,
  FaHistory,
  FaDownload,
  FaShare,
  FaPrint,
  FaCopy
} from 'react-icons/fa'

const ComplaintDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  
  const [complaint, setComplaint] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [comments, setComments] = useState([])
  const [likeCount, setLikeCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [likeLoading, setLikeLoading] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusComment, setStatusComment] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')

  useEffect(() => {
    fetchComplaintDetails()
  }, [id])

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📥 Fetching complaint details for ID:', id)
      
      // Fetch complaint details
      const complaintRes = await complaintAPI.getComplaintById(id)
      console.log('✅ Complaint details:', complaintRes)
      
      const complaintData = complaintRes.data || complaintRes
      setComplaint(complaintData)
      
      // Set like count from complaint data
      if (complaintData.likeCount !== undefined) {
        setLikeCount(complaintData.likeCount)
      } else if (complaintData.likesCount !== undefined) {
        setLikeCount(complaintData.likesCount)
      }
      
      // Set initial status
      if (complaintData.status) {
        setNewStatus(complaintData.status)
      }
      
      // TEMPORARILY COMMENT OUT TIMELINE TO AVOID ERRORS
      // const timelineRes = await complaintAPI.getTimeline(id)
      // console.log('✅ Timeline:', timelineRes)
      // setTimeline(timelineRes.data || timelineRes || [])
      setTimeline([]) // Empty array for now
      
      // Fetch comments
      const commentsRes = await commentAPI.getComments(id)
      console.log('✅ Comments:', commentsRes)
      setComments(commentsRes.data || commentsRes || [])
      
      // Check if user has liked this complaint (only if authenticated)
      if (isAuthenticated) {
        await fetchLikeStatus()
      } else {
        // For non-authenticated users, set hasLiked to false
        setHasLiked(false)
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch complaint details:', err)
      setError('Failed to load complaint details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLikeStatus = async () => {
    try {
      const data = await likeAPI.getLikeStatus(id)
      console.log('✅ Like status:', data)
      setHasLiked(data.hasLiked || false)
      // Update like count from status response
      if (data.likeCount !== undefined) {
        setLikeCount(data.likeCount)
      }
    } catch (err) {
      console.error('❌ Failed to fetch like status:', err)
      setHasLiked(false)
    }
  }

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      alert('Please login to like complaints')
      navigate('/login')
      return
    }

    setLikeLoading(true)
    try {
      const result = await likeAPI.toggleLike(id)
      console.log('✅ Like toggle result:', result)
      
      if (result.error) {
        alert(result.message || 'Failed to like complaint')
      } else {
        // Update like count
        setLikeCount(result.likeCount || 0)
        // Update like status
        setHasLiked(result.liked || false)
        
        // Also update complaint data
        setComplaint(prev => ({
          ...prev,
          likeCount: result.likeCount || 0
        }))
      }
    } catch (err) {
      console.error('❌ Failed to toggle like:', err)
      alert('Failed to like complaint. Please try again.')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Please enter a comment')
      return
    }
    
    if (!isAuthenticated) {
      alert('Please login to add comments')
      navigate('/login')
      return
    }
    
    setCommentLoading(true)
    try {
      console.log('📤 Adding comment:', newComment)
      const response = await commentAPI.addComment(id, newComment)
      console.log('✅ Comment added:', response)
      
      setComments(prev => [...prev, response.data || response])
      setNewComment('')
      
      // Update comment count
      setComplaint(prev => ({
        ...prev,
        commentCount: (prev.commentCount || 0) + 1
      }))
      
      alert('Comment added successfully!')
    } catch (err) {
      console.error('❌ Failed to add comment:', err)
      alert('Failed to add comment. Please try again.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === complaint.status) {
      alert('Please select a new status')
      return
    }

    if (!isAuthenticated) {
      alert('Please login to update status')
      navigate('/login')
      return
    }

    setStatusUpdateLoading(true)
    try {
      console.log('📤 Updating status:', newStatus)
      const response = await complaintAPI.updateComplaintStatus(
        id,
        newStatus,
        statusComment || undefined,
        isInternalNote
      )
      console.log('✅ Status update response:', response)

      if (response.success === false) {
        alert(response.message || 'Failed to update status')
      } else {
        // Update complaint data
        setComplaint(prev => ({
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString()
        }))
        
        // Reset form
        setStatusComment('')
        setIsInternalNote(false)
        
        // Refresh complaint details
        await fetchComplaintDetails()
        
        alert('Status updated successfully!')
      }
    } catch (err) {
      console.error('❌ Failed to update status:', err)
      alert('Failed to update status. Please try again.')
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess('Link copied to clipboard!')
        setTimeout(() => setCopySuccess(''), 3000)
      })
      .catch(err => {
        console.error('Failed to copy link:', err)
        setCopySuccess('Failed to copy link')
      })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    
    try {
      return new Date(dateString).toLocaleString('en-US', {
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
    switch (status) {
      case 'NEW':
        return 'bg-info'
      case 'UNDER_REVIEW':
        return 'bg-warning'
      case 'RESOLVED':
        return 'bg-success'
      default:
        return 'bg-secondary'
    }
  }

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case 'HIGH':
        return 'bg-danger'
      case 'MEDIUM':
        return 'bg-warning'
      case 'NORMAL':
        return 'bg-info'
      default:
        return 'bg-secondary'
    }
  }

  const canUpdateStatus = () => {
    if (!user || !complaint) return false
    
    if (user.role === 'ADMIN') return true
    
    if (user.role === 'SENIOR_EMPLOYEE') {
      // Can update if escalated to them or assigned to them
      return (complaint.escalatedToId === user.id) || 
             (complaint.assignedEmployeeId === user.id)
    }
    
    if (user.role === 'EMPLOYEE') {
      // Can update only if assigned to them
      return complaint.assignedEmployeeId === user.id
    }
    
    if (user.role === 'USER') {
      // Users can update only their own non-anonymous complaints
      return !complaint.anonymous && complaint.userId === user.id
    }
    
    return false
  }

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading complaint details...</p>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="alert alert-danger" role="alert">
        <div className="d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <div>
            <h4>Complaint not found</h4>
            <p>The complaint you're looking for doesn't exist or you don't have permission to view it.</p>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft className="me-1" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isOwner = user && complaint.userId && user.id === complaint.userId
  const canComment = isAuthenticated && (isOwner || complaint.isPublic || user?.role === 'EMPLOYEE' || user?.role === 'ADMIN' || user?.role === 'SENIOR_EMPLOYEE')

  return (
    <div className="complaint-details-container">
      {/* Back Button */}
      <button 
        className="btn btn-outline-secondary mb-4"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft className="me-1" />
        Back
      </button>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <div className="flex-grow-1">{error}</div>
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        </div>
      )}

      {/* Copy Success Alert */}
      {copySuccess && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <FaCheckCircle className="me-2" />
            <div className="flex-grow-1">{copySuccess}</div>
            <button type="button" className="btn-close" onClick={() => setCopySuccess('')}></button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-0">Complaint Details</h3>
          <small className="text-muted">ID: #{complaint.id}</small>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-secondary"
            onClick={handleCopyLink}
            title="Copy link to complaint"
          >
            <FaCopy className="me-1" />
            Copy Link
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={handlePrint}
            title="Print complaint details"
          >
            <FaPrint className="me-1" />
            Print
          </button>
        </div>
      </div>

      <div className="row">
        {/* Complaint Details - Main Content */}
        <div className="col-lg-8">
          {/* Complaint Header Card */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">{complaint.title}</h4>
                  <small className="text-muted">Submitted on {formatDate(complaint.createdAt)}</small>
                </div>
                <span className={`badge ${getStatusBadgeClass(complaint.status)} fs-6`}>
                  {complaint.status ? complaint.status.replace('_', ' ') : 'UNKNOWN'}
                </span>
              </div>
            </div>
            <div className="card-body">
              {/* Tags and Badges */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                <span className="badge bg-secondary">
                  <FaTag className="me-1" />
                  {complaint.category || 'Uncategorized'}
                </span>
                <span className={`badge ${getUrgencyBadgeClass(complaint.urgency)}`}>
                  <FaClock className="me-1" />
                  {complaint.urgency || 'NORMAL'}
                </span>
                {complaint.anonymous && (
                  <span className="badge bg-dark">
                    <FaUserSecret className="me-1" />
                    Anonymous
                  </span>
                )}
                {complaint.isPublic && (
                  <span className="badge bg-success">
                    <FaGlobe className="me-1" />
                    Public
                  </span>
                )}
              </div>
              
              {/* Description */}
              <div className="mb-4">
                <h6 className="text-muted mb-2">Description:</h6>
                <div className="card bg-light">
                  <div className="card-body">
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{complaint.description}</p>
                  </div>
                </div>
              </div>
              
              {/* Complaint Owner */}
              {!complaint.anonymous && complaint.userFullName && (
                <div className="alert alert-info">
                  <div className="d-flex align-items-center">
                    <FaUser className="me-2 fs-5" />
                    <div>
                      <strong>Submitted by:</strong> {complaint.userFullName}
                      {complaint.userEmail && (
                        <small className="d-block text-muted">
                          {complaint.userEmail}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Assigned Employee */}
              {complaint.assignedEmployeeName && (
                <div className="alert alert-warning">
                  <div className="d-flex align-items-center">
                    <FaUserCheck className="me-2 fs-5" />
                    <div>
                      <strong>Assigned to:</strong> {complaint.assignedEmployeeName}
                      {complaint.assignedEmployeeId && (
                        <small className="d-block text-muted">
                          Employee ID: {complaint.assignedEmployeeId}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Escalation Info */}
              {complaint.escalatedToName && (
                <div className="alert alert-danger">
                  <div className="d-flex align-items-center">
                    <FaArrowUp className="me-2 fs-5" />
                    <div>
                      <strong>Escalated to:</strong> {complaint.escalatedToName}
                      {complaint.escalationReason && (
                        <p className="mb-1"><strong>Reason:</strong> {complaint.escalationReason}</p>
                      )}
                      {complaint.escalationDate && (
                        <small className="d-block text-muted">
                          Escalated on: {formatDate(complaint.escalationDate)}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Update Form (for authorized users) */}
              {canUpdateStatus() && (
                <div className="card mt-4">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <FaSync className="me-2" />
                      Update Status
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">New Status</label>
                        <select 
                          className="form-select"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          <option value="">Select status</option>
                          <option value="NEW">New</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Internal Note</label>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            id="internalNoteCheck"
                          />
                          <label className="form-check-label" htmlFor="internalNoteCheck">
                            Mark as internal note (visible only to employees)
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status Comment (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Add a comment about the status change..."
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleStatusUpdate}
                      disabled={statusUpdateLoading || !newStatus || newStatus === complaint.status}
                    >
                      {statusUpdateLoading ? (
                        <>
                          <FaSpinner className="me-2 spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="me-2" />
                          Update Status
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Section - ADDED */}
          <div className="row mt-4">
            <div className="col-12">
              <AttachmentDisplay complaintId={id} />
            </div>
          </div>

          {/* Comments Section */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header">
              <h5 className="mb-0 d-flex align-items-center">
                <FaComment className="me-2" />
                Comments ({complaint.commentCount || comments.length || 0})
              </h5>
            </div>
            <div className="card-body">
              {/* Add Comment Form */}
              {canComment && (
                <div className="mb-4">
                  <div className="alert alert-light mb-3">
                    <FaInfoCircle className="me-2" />
                    You can add a comment to this complaint.
                    {complaint.anonymous && ' The complaint was submitted anonymously.'}
                  </div>
                  
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={commentLoading}
                    maxLength={1000}
                  />
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">
                      {newComment.length}/1000 characters
                    </small>
                    <button
                      className="btn btn-primary"
                      onClick={handleAddComment}
                      disabled={commentLoading || !newComment.trim()}
                    >
                      {commentLoading ? (
                        <>
                          <FaSpinner className="me-2 spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane className="me-1" />
                          Post Comment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="text-center py-4">
                  <FaComment className="display-4 text-muted mb-3" />
                  <p className="text-muted">No comments yet.</p>
                  {!canComment && isAuthenticated && (
                    <p className="text-warning">
                      <FaInfoCircle className="me-1" />
                      You cannot comment on this complaint.
                    </p>
                  )}
                  {!isAuthenticated && (
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate('/login')}
                    >
                      <FaSignInAlt className="me-1" />
                      Login to comment
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {comments.map(comment => (
                    <div key={comment.id || Math.random()} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <span className="comment-author fw-bold">
                              <FaUser className="me-2" />
                              {comment.user?.fullName || 'Unknown User'}
                            </span>
                            {comment.user?.role && (
                              <small className="ms-2 badge bg-secondary">
                                {comment.user.role}
                              </small>
                            )}
                          </div>
                          <span className="comment-time text-muted">
                            <FaClock className="me-1" />
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="col-lg-4">
          {/* Like Section */}
          {complaint.isPublic && (
            <div className="card mb-4 shadow-sm">
              <div className="card-header">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaHeart className="me-2 text-danger" />
                  Likes
                </h5>
              </div>
              <div className="card-body text-center">
                <div className="display-1 mb-2 text-danger">
                  {likeCount}
                </div>
                <p className="text-muted mb-4">
                  <FaHeart className="me-1 text-danger" />
                  {likeCount} like{likeCount !== 1 ? 's' : ''} on this complaint
                </p>
                <button
                  className={`btn ${hasLiked ? 'btn-danger' : 'btn-outline-danger'} w-100 py-2 mb-2`}
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                  title={isAuthenticated 
                    ? (hasLiked ? "Click to unlike" : "Click to like") 
                    : "Login to like"}
                >
                  {likeLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  ) : hasLiked ? (
                    <FaHeart className="me-2" />
                  ) : (
                    <FaHeart className="me-2" />
                  )}
                  {hasLiked ? 'Liked' : 'Like this complaint'}
                </button>
                
                {!isAuthenticated && (
                  <button 
                    className="btn btn-outline-primary w-100"
                    onClick={() => navigate('/login')}
                  >
                    <FaSignInAlt className="me-1" />
                    Login to like
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timeline (if available) */}
          {timeline.length > 0 && (
            <div className="card mb-4 shadow-sm">
              <div className="card-header">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaHistory className="me-2" />
                  Status Timeline
                </h5>
              </div>
              <div className="card-body">
                <div className="timeline">
                  {timeline.map((log, index) => (
                    <div key={log.id} className={`mb-3 ${index !== timeline.length - 1 ? 'pb-3 border-bottom' : ''}`}>
                      <div className="d-flex justify-content-between mb-1">
                        <div>
                          <span className={`badge ${getStatusBadgeClass(log.status)}`}>
                            {log.status ? log.status.replace('_', ' ') : 'Unknown'}
                          </span>
                        </div>
                        <small className="text-muted">
                          {formatDate(log.updatedAt)}
                        </small>
                      </div>
                      {log.comment && (
                        <p className="mb-1 small">{log.comment}</p>
                      )}
                      {log.updatedBy && (
                        <small className="text-muted d-block">
                          <FaUser className="me-1" />
                          By: {log.updatedBy.fullName || log.updatedByName || 'Unknown'}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Complaint Stats */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h5 className="mb-0 d-flex align-items-center">
                <FaChartLine className="me-2" />
                Complaint Stats
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center mb-3">
                <div className="col-4">
                  <div className="display-6 text-primary mb-1">{likeCount}</div>
                  <small className="text-muted">Likes</small>
                </div>
                <div className="col-4">
                  <div className="display-6 text-info mb-1">{complaint.commentCount || comments.length || 0}</div>
                  <small className="text-muted">Comments</small>
                </div>
                <div className="col-4">
                  <div className="display-6 text-success mb-1">{complaint.attachmentCount || 0}</div>
                  <small className="text-muted">Files</small>
                </div>
              </div>
              
              <hr />
              
              <div className="mt-3">
                <small className="text-muted d-block mb-2">
                  <FaCalendar className="me-1" />
                  <strong>Created:</strong> {formatDate(complaint.createdAt)}
                </small>
                <small className="text-muted d-block mb-2">
                  <FaClock className="me-1" />
                  <strong>Last Updated:</strong> {formatDate(complaint.updatedAt)}
                </small>
                <small className="text-muted d-block mb-2">
                  <FaTag className="me-1" />
                  <strong>Category:</strong> {complaint.category || 'N/A'}
                </small>
                <small className="text-muted d-block mb-2">
                  <FaClock className="me-1" />
                  <strong>Urgency:</strong> {complaint.urgency || 'NORMAL'}
                </small>
                <small className="text-muted d-block">
                  <FaEye className="me-1" />
                  <strong>Visibility:</strong> {complaint.isPublic ? 'Public' : 'Private'}
                </small>
              </div>
            </div>
          </div>

          {/* Internal Notes (for employees/admins) */}
          {(user?.role === 'ADMIN' || user?.role === 'SENIOR_EMPLOYEE' || user?.role === 'EMPLOYEE') && (
            <div className="card mb-4">
              <InternalNotes complaintId={id} />
            </div>
          )}

          {/* Action Buttons for Employees/Admins */}
          {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN' || user?.role === 'SENIOR_EMPLOYEE') && (
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h6 className="mb-0 d-flex align-items-center">
                  <FaCog className="me-2" />
                  Quick Actions
                </h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  {/* Status Update Button */}
                  {canUpdateStatus() && (
                    <button 
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => document.querySelector('.status-update-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <FaSync className="me-1" />
                      Update Status
                    </button>
                  )}
                  
                  {/* Internal Notes Button */}
                  {(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN' || user?.role === 'SENIOR_EMPLOYEE') && (
                    <button 
                      className="btn btn-sm btn-outline-info"
                      onClick={() => document.querySelector('.internal-notes-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <FaComments className="me-1" />
                      View Internal Notes
                    </button>
                  )}
                  
                  {/* Admin-specific actions */}
                  {user?.role === 'ADMIN' && (
                    <>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => alert('Assign to Employee feature coming soon!')}
                      >
                        <FaUserPlus className="me-1" />
                        Assign to Employee
                      </button>
                    </>
                  )}
                  
                  {/* Escalation Control for Admin */}
                  {user?.role === 'ADMIN' && complaint?.status === 'UNDER_REVIEW' && !complaint.escalatedToName && (
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => document.querySelector('.escalation-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <FaArrowUp className="me-1" />
                      Escalate Complaint
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Escalation Section (Admin only) */}
          {user?.role === 'ADMIN' && complaint?.status === 'UNDER_REVIEW' && (
            <div className="card mt-4" id="escalation-section">
              <div className="card-header bg-danger text-white">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaArrowUp className="me-2" />
                  Escalation Control
                </h5>
              </div>
              <div className="card-body">
                {complaint?.escalatedToName ? (
                  <div className="alert alert-info">
                    <p>
                      <strong>Already escalated to:</strong> {complaint.escalatedToName}
                    </p>
                    {complaint.escalationReason && (
                      <p>
                        <strong>Reason:</strong> {complaint.escalationReason}
                      </p>
                    )}
                    <small className="text-muted">
                      Escalated on: {formatDate(complaint.escalationDate)}
                    </small>
                  </div>
                ) : (
                  <EscalateComplaint 
                    complaintId={id} 
                    onEscalated={() => fetchComplaintDetails()}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ComplaintDetails