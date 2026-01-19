import { useState, useEffect } from 'react'
import { internalNotesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { 
  FaComment, FaUser, FaLock, FaUnlock, FaTrash, 
  FaReply, FaPaperPlane, FaExclamationTriangle, 
  FaSpinner, FaInfoCircle, FaClock
} from 'react-icons/fa'

const InternalNotes = ({ complaintId }) => {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [mentionedUserId, setMentionedUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchNotes()
    fetchUsers()
  }, [complaintId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const response = await internalNotesAPI.getNotes(complaintId)
      console.log('📝 Internal notes response:', response)
      
      if (response.success) {
        setNotes(response.notes || [])
      } else {
        setError(response.error || 'Failed to load notes')
        setNotes([])
      }
    } catch (err) {
      console.error('❌ Error fetching notes:', err)
      setError('Failed to load notes. Please try again.')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // This would need a users API endpoint
      // For now, we'll use a mock or you can implement this
      setUsers([])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) {
      setError('Please enter a note')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const noteData = {
        content: newNote.trim(),
        isPrivate: isPrivate,
        mentionedUserId: mentionedUserId || null
      }

      console.log('📤 Adding internal note:', noteData)
      const response = await internalNotesAPI.addNote(complaintId, noteData)
      console.log('✅ Add note response:', response)

      if (response.success) {
        setNewNote('')
        setIsPrivate(true)
        setMentionedUserId('')
        fetchNotes() // Refresh notes list
      } else {
        throw new Error(response.error || 'Failed to add note')
      }
    } catch (err) {
      console.error('❌ Error adding note:', err)
      setError(err.message || 'Failed to add note. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const response = await internalNotesAPI.deleteNote(noteId)
      
      if (response.success) {
        fetchNotes() // Refresh notes list
      } else {
        throw new Error(response.error || 'Failed to delete note')
      }
    } catch (err) {
      console.error('❌ Error deleting note:', err)
      setError('Failed to delete note. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getMentionText = (note) => {
    if (note.mentionedUser) {
      return `Mentioned ${note.mentionedUser.fullName}`
    }
    return null
  }

  return (
    <div className="card border-info shadow-sm">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <FaComment className="me-2" />
          Internal Notes ({notes.length})
        </h5>
      </div>
      
      <div className="card-body">
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <FaExclamationTriangle className="me-2" />
            {error}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setError('')}
            ></button>
          </div>
        )}

        {/* Add Note Form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-3">
            <textarea
              className="form-control"
              rows="3"
              placeholder="Add an internal note... Use @ to mention someone"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={submitting}
              maxLength="1000"
            />
            <div className="d-flex justify-content-between mt-1">
              <small className="text-muted">
                Notes are visible to staff only by default
              </small>
              <small className={newNote.length > 900 ? 'text-danger' : 'text-muted'}>
                {newNote.length}/1000 characters
              </small>
            </div>
          </div>
          
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-check-label" htmlFor="isPrivate">
                  {isPrivate ? (
                    <>
                      <FaLock className="me-1" /> Private Note
                    </>
                  ) : (
                    <>
                      <FaUnlock className="me-1" /> Public Note
                    </>
                  )}
                </label>
              </div>
            </div>
            
            <div className="col-md-6">
              <select
                className="form-select form-select-sm"
                value={mentionedUserId}
                onChange={(e) => setMentionedUserId(e.target.value)}
                disabled={submitting || users.length === 0}
              >
                <option value="">Mention someone...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    @{u.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !newNote.trim()}
            >
              {submitting ? (
                <>
                  <FaSpinner className="me-2 fa-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <FaPaperPlane className="me-2" />
                  Add Note
                </>
              )}
            </button>
          </div>
        </form>

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-4">
            <FaSpinner className="fa-spin me-2" />
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4">
            <FaComment className="display-4 text-muted mb-3" />
            <p className="text-muted">No internal notes yet</p>
            <small className="text-muted d-block">
              Add the first note to start the conversation
            </small>
          </div>
        ) : (
          <div className="notes-list">
            {notes.map(note => {
              const canDelete = user && (user.id === note.user?.id || user.role === 'ADMIN')
              
              return (
                <div key={note.id} className={`card mb-3 ${note.isPrivate ? 'border-info' : 'border-secondary'}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        <div className="user-avatar-small bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                             style={{ width: '32px', height: '32px' }}>
                          {note.user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <strong className="d-block">{note.user?.fullName || 'Unknown User'}</strong>
                          <small className="text-muted">
                            <FaClock className="me-1" />
                            {formatDate(note.createdAt)}
                          </small>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-center">
                        {note.isPrivate && (
                          <span className="badge bg-info me-2">
                            <FaLock className="me-1" />
                            Private
                          </span>
                        )}
                        
                        {canDelete && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(note.id)}
                            title="Delete note"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </p>
                    
                    {note.mentionedUser && (
                      <div className="alert alert-warning py-1 px-2 d-inline-flex align-items-center mt-2">
                        <FaReply className="me-1" />
                        <small>
                          <strong>Mentioned:</strong> {note.mentionedUser.fullName}
                        </small>
                      </div>
                    )}
                    
                    {note.updatedAt !== note.createdAt && (
                      <small className="text-muted d-block mt-2">
                        <FaInfoCircle className="me-1" />
                        Edited: {formatDate(note.updatedAt)}
                      </small>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info Footer */}
        <div className="alert alert-light mt-3">
          <small>
            <FaInfoCircle className="me-2" />
            <strong>Internal Notes Guide:</strong>
            <ul className="mb-0 ps-3 mt-1">
              <li>Private notes are visible only to staff</li>
              <li>Public notes are visible to complaint submitter</li>
              <li>Use @mentions to notify specific team members</li>
              <li>Notes cannot be edited, only deleted by author or admin</li>
            </ul>
          </small>
        </div>
      </div>
    </div>
  )
}

export default InternalNotes