import { useState, useEffect } from 'react'
import { exportAPI } from '../services/api'
import { 
  FaDownload, FaFileCsv, FaFilePdf, FaFileExcel, 
  FaClock, FaCheckCircle, FaTimesCircle, FaTrash,
  FaSpinner, FaInfoCircle, FaCalendar, FaFilter
} from 'react-icons/fa'

const ExportHistory = () => {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    fetchExports()
  }, [])

  const fetchExports = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('📋 Fetching export history...')
      const response = await exportAPI.getMyExports()
      console.log('✅ Export history:', response)
      
      if (response.success) {
        setExports(response.requests || [])
      } else {
        setError(response.error || 'Failed to load export history')
        setExports([])
      }
    } catch (err) {
      console.error('❌ Error fetching exports:', err)
      setError('Failed to load export history. Please try again.')
      setExports([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (exportId) => {
    try {
      setDownloading(prev => ({ ...prev, [exportId]: true }))
      
      console.log('📥 Downloading export:', exportId)
      const blob = await exportAPI.downloadExport(exportId)
      
      // Find the export to get filename
      const exportItem = exports.find(e => e.id === exportId)
      let filename = `export_${exportId}`
      
      if (exportItem) {
        const ext = getFileExtension(exportItem.format)
        filename = `export_${exportId}_${exportItem.requestedAt.replace(/[:.]/g, '-')}.${ext}`
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ Export downloaded successfully')
    } catch (err) {
      console.error('❌ Download error:', err)
      alert('Failed to download export: ' + err.message)
    } finally {
      setDownloading(prev => ({ ...prev, [exportId]: false }))
    }
  }

  const handleDelete = async (exportId) => {
    if (!window.confirm('Are you sure you want to delete this export record?')) {
      return
    }

    try {
      // Note: You'll need to add a delete endpoint in the backend
      // For now, we'll just filter it out from the UI
      setExports(prev => prev.filter(e => e.id !== exportId))
      alert('Export record deleted (local only - backend delete not implemented)')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete export record')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString('en-US', {
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

  const getFormatIcon = (format) => {
    switch(format) {
      case 'CSV':
        return <FaFileCsv className="text-success fs-5" />;
      case 'PDF':
        return <FaFilePdf className="text-danger fs-5" />;
      case 'EXCEL':
        return <FaFileExcel className="text-success fs-5" />;
      default:
        return <FaFileCsv className="text-secondary fs-5" />;
    }
  }

  const getFileExtension = (format) => {
    switch(format) {
      case 'CSV': return 'csv';
      case 'PDF': return 'pdf';
      case 'EXCEL': return 'xlsx';
      default: return 'bin';
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'COMPLETED': 
        return <span className="badge bg-success"><FaCheckCircle className="me-1" /> Completed</span>;
      case 'PROCESSING': 
        return <span className="badge bg-warning"><FaClock className="me-1" /> Processing</span>;
      case 'PENDING': 
        return <span className="badge bg-info"><FaClock className="me-1" /> Pending</span>;
      case 'FAILED': 
        return <span className="badge bg-danger"><FaTimesCircle className="me-1" /> Failed</span>;
      default: 
        return <span className="badge bg-secondary">{status}</span>;
    }
  }

  const formatFilters = (filters) => {
    if (!filters || typeof filters !== 'object') return 'No filters';
    
    return Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') || 'No filters';
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">Loading export history...</span>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-2">
            <FaDownload className="me-2 text-primary" />
            Export History
          </h1>
          <p className="text-muted">Download your previously generated reports</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchExports}
            disabled={loading}
          >
            <FaSpinner className={`me-2 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <FaTimesCircle className="me-2" />
          {error}
        </div>
      )}

      <div className="card shadow">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FaCalendar className="me-2" />
              My Export Requests ({exports.length})
            </h5>
            <div className="text-muted small">
              Exports are stored for 30 days
            </div>
          </div>
        </div>
        
        <div className="card-body">
          {exports.length === 0 ? (
            <div className="text-center py-5">
              <FaDownload className="display-1 text-muted mb-3" />
              <h4>No Export History</h4>
              <p className="text-muted mb-4">
                You haven't generated any exports yet.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Format</th>
                    <th>Status</th>
                    <th>Filters</th>
                    <th>Records</th>
                    <th>Requested</th>
                    <th>Completed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {getFormatIcon(exp.format)}
                          <span className="ms-2 fw-semibold">{exp.format}</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(exp.status)}</td>
                      <td>
                        <small className="text-muted" title={JSON.stringify(exp.filters, null, 2)}>
                          <FaFilter className="me-1" />
                          {formatFilters(exp.filters)}
                        </small>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {exp.recordCount || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          <FaCalendar className="me-1" />
                          {formatDate(exp.requestedAt)}
                        </small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {exp.completedAt ? formatDate(exp.completedAt) : 'N/A'}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {exp.status === 'COMPLETED' ? (
                            <button
                              className="btn btn-primary"
                              onClick={() => handleDownload(exp.id)}
                              disabled={downloading[exp.id]}
                              title="Download export"
                            >
                              {downloading[exp.id] ? (
                                <FaSpinner className="fa-spin" />
                              ) : (
                                <FaDownload />
                              )}
                            </button>
                          ) : (
                            <button className="btn btn-secondary" disabled title="Not ready">
                              <FaClock />
                            </button>
                          )}
                          
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(exp.id)}
                            title="Delete record"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="card-footer">
          <div className="row">
            <div className="col-md-6">
              <div className="alert alert-info mb-0">
                <small>
                  <FaInfoCircle className="me-2" />
                  <strong>How exports work:</strong>
                  <ul className="mb-0 ps-3 mt-1">
                    <li>Large exports may take several minutes to process</li>
                    <li>You'll receive notifications when exports are ready</li>
                    <li>Exports are automatically deleted after 30 days</li>
                  </ul>
                </small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-end">
                <small className="text-muted">
                  Showing {exports.length} export{exports.length !== 1 ? 's' : ''}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportHistory