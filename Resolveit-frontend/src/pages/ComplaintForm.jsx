import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { complaintAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FaUpload, FaPaperclip, FaTimes, FaExclamationTriangle, FaSpinner, FaInfoCircle, FaShieldAlt } from 'react-icons/fa';
import './ComplaintForm.css';

const ComplaintForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    urgency: 'NORMAL',
    anonymous: false
  })
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const categories = [
    'Infrastructure',
    'Sanitation',
    'Security',
    'Transport',
    'Healthcare',
    'Education',
    'Environment',
    'Utilities',
    'Other'
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const totalSize = [...files, ...selectedFiles].reduce((sum, file) => sum + file.size, 0)
    
    if (totalSize > 10 * 1024 * 1024) {
      setError('Total file size exceeds 10MB limit')
      return
    }
    
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitWithAttachments = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        setError('Title is required')
        setLoading(false)
        return
      }
      
      if (!formData.description.trim()) {
        setError('Description is required')
        setLoading(false)
        return
      }
      
      if (!formData.category) {
        setError('Category is required')
        setLoading(false)
        return
      }

      // For non-anonymous complaints, check if user is logged in
      if (!formData.anonymous && !user) {
        setError('Please login to submit a non-anonymous complaint')
        setLoading(false)
        return
      }

      // Create FormData
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('category', formData.category)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('urgency', formData.urgency)
      formDataToSend.append('anonymous', formData.anonymous.toString())
      
      // Add files
      if (files.length > 0) {
        files.forEach(file => {
          formDataToSend.append('files', file)
        })
      }

      console.log('📤 Submitting complaint with attachments...')
      
      // Submit complaint
      const result = await complaintAPI.submitComplaintWithAttachments(formDataToSend, formData.anonymous)
      
      if (result.success === false) {
        setError(result.error || 'Submission failed')
      } else {
        const fileMsg = files.length > 0 ? `with ${files.length} attachment(s)` : ''
        setSuccess(`Complaint submitted successfully ${fileMsg}! Redirecting...`)
        
        // Redirect based on user login and anonymous status
        if (user && !formData.anonymous) {
          setTimeout(() => navigate('/my-complaints'), 2000)
        } else {
          setTimeout(() => navigate('/public-complaints'), 2000)
        }
      }
      
    } catch (err) {
      console.error('Submission error:', err)
      if (err.status === 401 || err.status === 403) {
        setError('Your session has expired. Please login again.')
        logout()
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.message || 'Failed to submit complaint')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitWithoutAttachments = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        setError('Title is required')
        setLoading(false)
        return
      }
      
      if (!formData.description.trim()) {
        setError('Description is required')
        setLoading(false)
        return
      }
      
      if (!formData.category) {
        setError('Category is required')
        setLoading(false)
        return
      }

      // For non-anonymous complaints, check if user is logged in
      if (!formData.anonymous && !user) {
        setError('Please login to submit a non-anonymous complaint')
        setLoading(false)
        return
      }

      const complaintData = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        urgency: formData.urgency,
        anonymous: formData.anonymous
      }

      console.log('📤 Submitting complaint without attachments...')
      const result = await complaintAPI.submitComplaint(complaintData, formData.anonymous)
      
      if (result.success === false) {
        setError(result.error || 'Submission failed')
      } else {
        setSuccess('Complaint submitted successfully! Redirecting...')
        
        // Redirect based on user login and anonymous status
        if (user && !formData.anonymous) {
          setTimeout(() => navigate('/my-complaints'), 2000)
        } else {
          setTimeout(() => navigate('/public-complaints'), 2000)
        }
      }
      
    } catch (err) {
      console.error('Submission error:', err)
      if (err.status === 401 || err.status === 403) {
        setError('Your session has expired. Please login again.')
        logout()
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError(err.message || 'Failed to submit complaint')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="complaint-form-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8 col-lg-10">
            {/* Header Card */}
            <div className="header-card mb-4">
              <div className="d-flex align-items-center">
                <div className="header-icon">
                  <FaUpload />
                </div>
                <div>
                  <h1 className="display-6 fw-bold mb-1">Submit New Complaint</h1>
                  <p className="text-muted mb-0">
                    Voice your concern and help improve our community.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Form Card */}
            <div className="form-card">
              {/* Alerts */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <div className="d-flex align-items-center">
                    <FaExclamationTriangle className="me-3" />
                    <div className="flex-grow-1">{error}</div>
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                </div>
              )}

              {success && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  <div className="d-flex align-items-center">
                    <FaInfoCircle className="me-3" />
                    <div className="flex-grow-1">{success}</div>
                    <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitWithAttachments}>
                <div className="form-section mb-4">
                  <h3 className="section-title">
                    <span className="section-number">1</span>
                    Complaint Information
                  </h3>
                  
                  <div className="mb-4">
                    <label htmlFor="title" className="form-label fw-semibold">
                      Issue Title *
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Briefly describe the issue"
                      required
                    />
                  </div>
                  
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label htmlFor="category" className="form-label fw-semibold">
                        Category *
                      </label>
                      <select
                        className="form-select form-select-lg"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-6">
                      <label htmlFor="urgency" className="form-label fw-semibold">
                        Urgency Level *
                      </label>
                      <select
                        className="form-select form-select-lg"
                        id="urgency"
                        name="urgency"
                        value={formData.urgency}
                        onChange={handleChange}
                        required
                      >
                        <option value="NORMAL">Normal Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section mb-4">
                  <h3 className="section-title">
                    <span className="section-number">2</span>
                    Description
                  </h3>
                  
                  <div className="mb-4">
                    <label htmlFor="description" className="form-label fw-semibold">
                      Detailed Description *
                    </label>
                    <textarea
                      className="form-control form-control-lg"
                      id="description"
                      name="description"
                      rows="5"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Provide detailed information about the issue..."
                      required
                    />
                  </div>
                </div>

                <div className="form-section mb-4">
                  <h3 className="section-title">
                    <span className="section-number">3</span>
                    Attachments (Optional)
                  </h3>
                  
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <FaPaperclip className="me-2" />
                      Supporting Documents
                    </label>
                    <div className="file-upload-area">
                      <input
                        type="file"
                        className="file-input"
                        id="files"
                        multiple
                        onChange={handleFileChange}
                      />
                      <label htmlFor="files" className="file-upload-label">
                        <div className="upload-icon">
                          <FaUpload />
                        </div>
                        <div>
                          <h5>Drop files here or click to upload</h5>
                          <p className="text-muted">Maximum 10MB total • Supports images, PDF, documents, text files</p>
                        </div>
                      </label>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="files-list mt-3">
                        <h6 className="mb-2">Selected Files:</h6>
                        <div className="file-items">
                          {files.map((file, index) => (
                            <div key={index} className="file-item">
                              <div className="file-info">
                                <FaPaperclip className="me-2" />
                                <span className="file-name">{file.name}</span>
                                <small className="file-size ms-2">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </small>
                              </div>
                              <button
                                type="button"
                                className="file-remove"
                                onClick={() => removeFile(index)}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-section mb-5">
                  <h3 className="section-title">
                    <span className="section-number">4</span>
                    Privacy Settings
                  </h3>
                  
                  <div className="privacy-card">
                    <div className="privacy-content">
                      <div className="privacy-icon">
                        <FaShieldAlt />
                      </div>
                      <div className="privacy-details">
                        <h5 className="mb-2">Anonymous Submission</h5>
                        <p className="text-muted mb-3">
                          Your identity will be completely hidden. No one will be able to see who submitted this complaint.
                          <span className="d-block mt-1 text-info">
                            <strong>Note:</strong> Anonymous complaints will not appear in your "My Complaints" page.
                          </span>
                        </p>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="anonymous"
                            name="anonymous"
                            checked={formData.anonymous}
                            onChange={handleChange}
                          />
                          <label className="form-check-label fw-semibold" htmlFor="anonymous">
                            Submit Anonymously
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                  <div className="d-flex justify-content-between">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-lg"
                      onClick={() => navigate(-1)}
                    >
                      Cancel
                    </button>
                    
                    <div className="d-flex gap-3">
                      <button 
                        type="button" 
                        className="btn btn-primary btn-lg px-4"
                        onClick={handleSubmitWithoutAttachments}
                        disabled={loading}
                      >
                        {loading && files.length === 0 ? (
                          <>
                            <FaSpinner className="me-2 spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Without Files'
                        )}
                      </button>
                      
                      <button 
                        type="submit" 
                        className="btn btn-success btn-lg px-4"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <FaSpinner className="me-2 spin" />
                            {files.length > 0 ? 'Uploading...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <FaUpload className="me-2" />
                            {files.length > 0 ? `Submit with ${files.length} File(s)` : 'Submit'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplaintForm