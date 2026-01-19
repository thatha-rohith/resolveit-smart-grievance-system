import React, { useState, useEffect } from 'react';
import { attachmentAPI } from '../services/api';
import { 
  FaPaperclip, 
  FaDownload, 
  FaTrash, 
  FaSpinner,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileAlt,
  FaFileExcel,
  FaFileArchive,
  FaExclamationTriangle,
  FaInfoCircle,
  FaEye,
  FaTimes
} from 'react-icons/fa';
import './AttachmentDisplay.css';

const AttachmentDisplay = ({ complaintId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState({});
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState('');

  useEffect(() => {
    if (complaintId) {
      fetchAttachments();
    }
  }, [complaintId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await attachmentAPI.getAttachments(complaintId);
      
      // Handle different response formats
      if (response.success === false) {
        setError(response.error || 'Failed to load attachments');
        setAttachments([]);
      } else if (response.data) {
        setAttachments(response.data.attachments || response.data || []);
      } else if (Array.isArray(response)) {
        setAttachments(response);
      } else if (response.attachments) {
        setAttachments(response.attachments);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error('❌ Failed to fetch attachments:', err);
      setError('Failed to load attachments. Please try again.');
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      return <FaFileImage className="text-primary file-icon" />;
    } else if (ext === 'pdf') {
      return <FaFilePdf className="text-danger file-icon" />;
    } else if (['doc', 'docx'].includes(ext)) {
      return <FaFileWord className="text-primary file-icon" />;
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FaFileExcel className="text-success file-icon" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FaFileArchive className="text-warning file-icon" />;
    } else if (ext === 'txt') {
      return <FaFileAlt className="text-secondary file-icon" />;
    }
    return <FaFileAlt className="text-muted file-icon" />;
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
      return 'image';
    } else if (ext === 'pdf') {
      return 'pdf';
    } else {
      return 'document';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const token = localStorage.getItem('token');
      const downloadUrl = `http://localhost:8080/complaints/${complaintId}/attachments/${attachment.id}`;
      
      console.log('📥 Attempting to download:', downloadUrl);
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(downloadUrl, { headers });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ File downloaded successfully:', attachment.filename);
    } catch (err) {
      console.error('❌ Download failed:', err);
      setError('Failed to download file. Please try again or contact support.');
    }
  };

  const handlePreview = (attachment) => {
    const fileType = getFileType(attachment.filename);
    const token = localStorage.getItem('token');
    const previewUrl = `http://localhost:8080/complaints/${complaintId}/attachments/${attachment.id}`;
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // For images and PDFs, we can open in new tab
    if (fileType === 'image' || fileType === 'pdf') {
      window.open(previewUrl, '_blank');
    } else {
      // For other files, try to download
      handleDownload(attachment);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to delete this attachment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(prev => ({ ...prev, [attachmentId]: true }));
      setError('');
      
      const response = await attachmentAPI.deleteAttachment(attachmentId);
      console.log('✅ Delete response:', response);

      if (response.success === false) {
        setError(response.error || 'Delete failed');
      } else {
        // Remove from list
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
        setError('');
      }
    } catch (err) {
      console.error('❌ Delete error:', err);
      setError('Failed to delete attachment. Please try again.');
    } finally {
      setDeleting(prev => ({ ...prev, [attachmentId]: false }));
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewType('');
  };

  if (loading) {
    return (
      <div className="attachments-container">
        <div className="attachments-header">
          <h5><FaPaperclip className="me-2" />Attachments</h5>
        </div>
        <div className="text-center py-5">
          <FaSpinner className="spin text-primary mb-3" size={32} />
          <p className="text-muted">Loading attachments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attachments-container">
      <div className="attachments-header">
        <h5>
          <FaPaperclip className="me-2" />
          Attachments ({attachments.length})
        </h5>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mx-3 mt-3" role="alert">
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <div>{error}</div>
            <button 
              type="button" 
              className="btn-close ms-auto" 
              onClick={() => setError('')}
            ></button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="preview-modal">
          <div className="preview-overlay" onClick={closePreview}></div>
          <div className="preview-content">
            <div className="preview-header">
              <h5>Preview</h5>
              <button className="btn-close" onClick={closePreview}></button>
            </div>
            <div className="preview-body">
              {previewType === 'image' ? (
                <img src={previewUrl} alt="Preview" className="img-fluid" />
              ) : previewType === 'pdf' ? (
                <iframe src={previewUrl} title="PDF Preview" className="w-100 h-100"></iframe>
              ) : (
                <div className="text-center py-5">
                  <FaFileAlt className="display-4 text-muted mb-3" />
                  <p>Preview not available for this file type</p>
                  <button className="btn btn-primary" onClick={() => window.open(previewUrl, '_blank')}>
                    Open in new tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-5">
          <FaPaperclip className="display-4 text-muted mb-3" />
          <p className="text-muted">No attachments found</p>
          <small className="text-muted">
            Attachments can only be added during complaint submission
          </small>
        </div>
      ) : (
        <div className="attachments-content">
          <div className="alert alert-info mx-3 mt-3 mb-4">
            <FaInfoCircle className="me-2" />
            <strong>Note:</strong> Click on file names to preview, or use download button to save files.
          </div>
          
          <div className="attachments-grid">
            {attachments.map((attachment) => {
              const fileType = getFileType(attachment.filename);
              const isImage = fileType === 'image';
              
              return (
                <div key={attachment.id} className="attachment-card">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-transparent border-bottom-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          {getFileIcon(attachment.filename)}
                          <span className="ms-2 small text-truncate" title={attachment.filename}>
                            {attachment.filename.length > 20 
                              ? attachment.filename.substring(0, 20) + '...' 
                              : attachment.filename}
                          </span>
                        </div>
                        <div className="attachment-actions">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handlePreview(attachment)}
                            title={isImage ? "Preview" : "Download"}
                          >
                            {isImage ? <FaEye /> : <FaDownload />}
                          </button>
                          {localStorage.getItem('userRole') === 'ADMIN' && (
                            <button
                              className="btn btn-sm btn-outline-danger ms-1"
                              onClick={() => handleDelete(attachment.id)}
                              disabled={deleting[attachment.id]}
                              title="Delete"
                            >
                              {deleting[attachment.id] ? (
                                <FaSpinner className="spin" />
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      {isImage && (
                        <div className="attachment-preview mb-3">
                          <div 
                            className="image-preview-placeholder"
                            onClick={() => handlePreview(attachment)}
                            style={{ 
                              backgroundImage: `url(http://localhost:8080/complaints/${complaintId}/attachments/${attachment.id})`,
                              cursor: 'pointer'
                            }}
                          >
                            <div className="preview-overlay">
                              <FaEye className="text-white" size={24} />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="attachment-details">
                        <div className="mb-2">
                          <small className="text-muted d-block">
                            <strong>File:</strong> {attachment.filename}
                          </small>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted d-block">
                            <strong>Size:</strong> {formatFileSize(attachment.fileSize)}
                          </small>
                        </div>
                        <div>
                          <small className="text-muted d-block">
                            <strong>Uploaded:</strong> {formatDate(attachment.uploadedAt)}
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-footer bg-transparent border-top-0">
                      <div className="d-grid">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownload(attachment)}
                          title="Download file"
                        >
                          <FaDownload className="me-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentDisplay;