import { useState } from 'react'
import { exportAPI } from '../services/api'
import { FaFileExport, FaFilter, FaCalendar, FaDownload } from 'react-icons/fa'

const ExportPage = () => {
  const [format, setFormat] = useState('CSV')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    category: '',
    urgency: ''
  })
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    try {
      setLoading(true)
      const response = await exportAPI.requestExport({
        format: format,
        filters: filters
      })
      
      if (response.success) {
        alert(`Export request submitted successfully! Request ID: ${response.requestId}`)
        // Reset filters
        setFilters({
          startDate: '',
          endDate: '',
          status: '',
          category: '',
          urgency: ''
        })
      }
    } catch (err) {
      alert('Failed to request export: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <div className="d-flex align-items-center">
                <FaFileExport className="me-3 fs-3" />
                <div>
                  <h2 className="mb-0">Export Complaint Data</h2>
                  <p className="mb-0">Generate reports in various formats</p>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Format Selection */}
              <div className="mb-4">
                <h5 className="mb-3">
                  <FaFileExport className="me-2" />
                  Select Export Format
                </h5>
                <div className="row g-3">
                  {['CSV', 'PDF', 'EXCEL'].map(fmt => (
                    <div key={fmt} className="col-md-4">
                      <div className={`card format-card ${format === fmt ? 'selected' : ''}`}
                           onClick={() => setFormat(fmt)}>
                        <div className="card-body text-center">
                          {fmt === 'CSV' && <FaFileExport className="text-success fs-1 mb-3" />}
                          {fmt === 'PDF' && <FaFileExport className="text-danger fs-1 mb-3" />}
                          {fmt === 'EXCEL' && <FaFileExport className="text-success fs-1 mb-3" />}
                          <h5>{fmt}</h5>
                          <small className="text-muted">
                            {fmt === 'CSV' && 'Comma-separated values'}
                            {fmt === 'PDF' && 'Portable Document Format'}
                            {fmt === 'EXCEL' && 'Microsoft Excel format'}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4">
                <h5 className="mb-3">
                  <FaFilter className="me-2" />
                  Apply Filters (Optional)
                </h5>
                
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      <option value="">All Statuses</option>
                      <option value="NEW">New</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Infrastructure"
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label">Urgency</label>
                    <select
                      className="form-select"
                      value={filters.urgency}
                      onChange={(e) => setFilters({...filters, urgency: e.target.value})}
                    >
                      <option value="">All Urgency</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="NORMAL">Normal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="d-grid">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleExport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing Export Request...
                    </>
                  ) : (
                    <>
                      <FaDownload className="me-2" />
                      Generate {format} Export
                    </>
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="alert alert-info mt-4">
                <h6>
                  <FaCalendar className="me-2" />
                  How Exports Work
                </h6>
                <ul className="mb-0">
                  <li>Exports are processed in the background</li>
                  <li>You'll receive a notification when your export is ready</li>
                  <li>Download exports from the Export History page</li>
                  <li>Exports are available for 30 days</li>
                  <li>Large exports may take several minutes to process</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportPage