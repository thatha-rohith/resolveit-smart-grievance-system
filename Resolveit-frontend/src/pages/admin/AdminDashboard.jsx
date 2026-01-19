import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, instantExportAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Chart from 'react-apexcharts'
import {
  FaChartBar, FaChartPie, FaChartLine, FaCalendarAlt,
  FaExclamationTriangle, FaCheckCircle, FaClock, FaUsers,
  FaArrowUp, FaDownload, FaSync, FaFileExport,
  FaCog, FaBell, FaInfo, FaFileAlt, FaFilePdf,
  FaFileCsv, FaFileExcel
} from 'react-icons/fa'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState('')
  const [exportFormat, setExportFormat] = useState('CSV')
  const [exportType, setExportType] = useState('complaints') // 'complaints', 'performance', 'dashboard'
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    category: '',
    urgency: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await dashboardAPI.getAdminDashboard()
      setStats(data)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantExport = async () => {
    try {
      setExportLoading(true)
      
      // Build filters object
      const filters = {}
      if (exportFilters.startDate) filters.startDate = exportFilters.startDate
      if (exportFilters.endDate) filters.endDate = exportFilters.endDate
      if (exportFilters.status) filters.status = exportFilters.status
      if (exportFilters.category) filters.category = exportFilters.category
      if (exportFilters.urgency) filters.urgency = exportFilters.urgency
      
      // Determine which export method to use
      let result
      switch (exportType) {
        case 'complaints':
          result = await instantExportAPI.downloadComplaintsFile(exportFormat, filters)
          break
        case 'performance':
          result = await instantExportAPI.downloadPerformanceFile(exportFormat, filters)
          break
        case 'dashboard':
          result = await instantExportAPI.downloadDashboardFile(exportFormat)
          break
        default:
          throw new Error('Invalid export type')
      }
      
      if (result.success) {
        // Close modal using native Bootstrap method
        const modalElement = document.getElementById('exportModal')
        if (modalElement) {
          const modal = window.bootstrap ? window.bootstrap.Modal.getInstance(modalElement) : null
          if (modal) {
            modal.hide()
          } else {
            // Fallback: Remove modal classes
            modalElement.classList.remove('show')
            modalElement.style.display = 'none'
            document.body.classList.remove('modal-open')
            const backdrop = document.querySelector('.modal-backdrop')
            if (backdrop) backdrop.remove()
          }
        }
        
        // Reset form
        setExportFilters({
          startDate: '',
          endDate: '',
          status: '',
          category: '',
          urgency: ''
        })
      }
      
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export: ' + (err.message || 'Unknown error'))
    } finally {
      setExportLoading(false)
    }
  }

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0'
  }

  // Helper to manually close modal
  const closeExportModal = () => {
    const modalElement = document.getElementById('exportModal')
    if (modalElement) {
      modalElement.classList.remove('show')
      modalElement.style.display = 'none'
      document.body.classList.remove('modal-open')
      const backdrop = document.querySelector('.modal-backdrop')
      if (backdrop) backdrop.remove()
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Dashboard Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-2 text-primary">Admin Dashboard</h1>
          <p className="text-muted">System overview and performance analytics</p>
        </div>
        <div>
          <button 
            className="btn btn-outline-primary me-2" 
            onClick={fetchDashboardData}
          >
            <FaSync className="me-2" /> Refresh
          </button>
          <button 
            className="btn btn-primary" 
            data-bs-toggle="modal" 
            data-bs-target="#exportModal"
          >
            <FaDownload className="me-2" /> Instant Export
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <FaExclamationTriangle className="me-2" />
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="row mb-4">
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-primary shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-primary">{formatNumber(stats?.totalComplaints)}</div>
                  <div className="small text-muted">Total Complaints</div>
                </div>
                <div className="align-self-center">
                  <FaChartBar className="fa-2x text-primary opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-primary">
                <FaArrowUp className="me-1" /> Overall
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-info shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-info">{formatNumber(stats?.newComplaints)}</div>
                  <div className="small text-muted">New Complaints</div>
                </div>
                <div className="align-self-center">
                  <FaBell className="fa-2x text-info opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-info">
                <FaClock className="me-1" /> Recent
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-warning shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-warning">{formatNumber(stats?.inProgressComplaints)}</div>
                  <div className="small text-muted">In Progress</div>
                </div>
                <div className="align-self-center">
                  <FaClock className="fa-2x text-warning opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-warning">
                <FaSync className="me-1" /> Active
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-success shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-success">{formatNumber(stats?.resolvedComplaints)}</div>
                  <div className="small text-muted">Resolved</div>
                </div>
                <div className="align-self-center">
                  <FaCheckCircle className="fa-2x text-success opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-success">
                <FaCheckCircle className="me-1" /> Completed
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-danger shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-danger">{formatNumber(stats?.pendingEscalations)}</div>
                  <div className="small text-muted">Pending Escalation</div>
                </div>
                <div className="align-self-center">
                  <FaExclamationTriangle className="fa-2x text-danger opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-danger">
                <FaArrowUp className="me-1" /> Requires Attention
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-secondary shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-secondary">
                    {stats?.averageResolutionTime ? 
                      `${stats.averageResolutionTime.toFixed(1)}h` : 'N/A'}
                  </div>
                  <div className="small text-muted">Avg. Resolution Time</div>
                </div>
                <div className="align-self-center">
                  <FaChartLine className="fa-2x text-secondary opacity-75" />
                </div>
              </div>
              <div className="mt-2 small text-secondary">
                <FaChartLine className="me-1" /> Efficiency
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-xl-4 col-lg-6">
          <div className="card shadow h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaChartPie className="me-2" />
                Complaints by Category
              </h6>
            </div>
            <div className="card-body">
              {stats?.complaintsByCategory && Object.keys(stats.complaintsByCategory).length > 0 ? (
                <Chart
                  options={{
                    chart: { type: 'pie' },
                    labels: Object.keys(stats.complaintsByCategory),
                    legend: { position: 'bottom' },
                    colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796']
                  }}
                  series={Object.values(stats.complaintsByCategory)}
                  type="pie"
                  height="300"
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-lg-6">
          <div className="card shadow h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaChartBar className="me-2" />
                Complaints by Status
              </h6>
            </div>
            <div className="card-body">
              {stats?.complaintsByStatus && Object.keys(stats.complaintsByStatus).length > 0 ? (
                <Chart
                  options={{
                    chart: { type: 'bar' },
                    plotOptions: {
                      bar: { horizontal: false, columnWidth: '55%' }
                    },
                    xaxis: {
                      categories: Object.keys(stats.complaintsByStatus)
                    },
                    colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b']
                  }}
                  series={[{
                    name: 'Count',
                    data: Object.values(stats.complaintsByStatus)
                  }]}
                  type="bar"
                  height="300"
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No status data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-lg-12">
          <div className="card shadow h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaChartLine className="me-2" />
                Daily Trend (30 Days)
              </h6>
            </div>
            <div className="card-body">
              {stats?.complaintsByDay && Object.keys(stats.complaintsByDay).length > 0 ? (
                <Chart
                  options={{
                    chart: { type: 'line' },
                    xaxis: {
                      categories: Object.keys(stats.complaintsByDay)
                    },
                    stroke: { curve: 'smooth' },
                    colors: ['#e74a3b']
                  }}
                  series={[{
                    name: 'Complaints',
                    data: Object.values(stats.complaintsByDay)
                  }]}
                  type="line"
                  height="300"
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No trend data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats & Actions */}
      <div className="row">
        <div className="col-lg-8">
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card shadow">
                <div className="card-header bg-white border-bottom">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <FaExclamationTriangle className="me-2" />
                    Urgency Distribution
                  </h6>
                </div>
                <div className="card-body">
                  {stats?.complaintsByUrgency && Object.keys(stats.complaintsByUrgency).length > 0 ? (
                    <div className="list-group list-group-flush">
                      {Object.entries(stats.complaintsByUrgency).map(([urgency, count]) => (
                        <div key={urgency} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>
                            <span className={`badge bg-${urgency === 'HIGH' ? 'danger' : urgency === 'MEDIUM' ? 'warning' : 'info'} me-2`}>
                              {urgency}
                            </span>
                          </span>
                          <span className="font-weight-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No urgency data</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card shadow">
                <div className="card-header bg-white border-bottom">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <FaUsers className="me-2" />
                    Performance Metrics
                  </h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <small className="text-muted">Past Due Complaints</small>
                    <div className="h4 text-danger">{stats?.complaintsPastDue || 0}</div>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Resolution Rate</small>
                    <div className="h4 text-success">
                      {stats?.totalComplaints > 0 ? 
                        `${((stats.resolvedComplaints / stats.totalComplaints) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <div>
                    <small className="text-muted">Avg. Days to Resolve</small>
                    <div className="h4 text-info">
                      {stats?.averageResolutionTime ? 
                        `${(stats.averageResolutionTime / 24).toFixed(1)} days` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header bg-white border-bottom">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaCog className="me-2" />
                Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/admin/complaints" className="btn btn-primary">
                  <FaFileAlt className="me-2" />
                  Manage Complaints
                </Link>
                <Link to="/admin/employees" className="btn btn-info">
                  <FaUsers className="me-2" />
                  Manage Employees
                </Link>
                <Link to="/admin/reports" className="btn btn-success">
                  <FaChartBar className="me-2" />
                  View Reports
                </Link>
                <button 
                  className="btn btn-outline-dark" 
                  data-bs-toggle="modal" 
                  data-bs-target="#exportModal"
                >
                  <FaFileExport className="me-2" />
                  Instant Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Export Modal - Fixed accessibility issue */}
      <div className="modal fade" id="exportModal" tabIndex="-1" aria-labelledby="exportModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title" id="exportModalLabel">Instant Export</h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                data-bs-dismiss="modal" 
                aria-label="Close"
                onClick={closeExportModal}
              ></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="exportType" className="form-label fw-bold">Export Type</label>
                <select 
                  id="exportType"
                  className="form-select"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                >
                  <option value="complaints">Complaints Data</option>
                  <option value="performance">Performance Report</option>
                  <option value="dashboard">Dashboard Statistics</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Export Format</label>
                <div className="d-flex gap-2">
                  <button 
                    type="button" 
                    className={`btn btn-outline-dark flex-fill ${exportFormat === 'CSV' ? 'active' : ''}`}
                    onClick={() => setExportFormat('CSV')}
                  >
                    <FaFileCsv className="me-2" /> CSV
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-outline-danger flex-fill ${exportFormat === 'PDF' ? 'active' : ''}`}
                    onClick={() => setExportFormat('PDF')}
                  >
                    <FaFilePdf className="me-2" /> PDF
                  </button>
                  <button 
                    type="button" 
                    className={`btn btn-outline-success flex-fill ${exportFormat === 'EXCEL' ? 'active' : ''}`}
                    onClick={() => setExportFormat('EXCEL')}
                  >
                    <FaFileExcel className="me-2" /> Excel
                  </button>
                </div>
              </div>
              
              {(exportType === 'complaints' || exportType === 'performance') && (
                <div className="mb-3">
                  <label className="form-label fw-bold">Filters (Optional)</label>
                  
                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <label htmlFor="startDate" className="form-label small">Start Date</label>
                      <input 
                        id="startDate"
                        type="date" 
                        className="form-control form-control-sm"
                        value={exportFilters.startDate}
                        onChange={(e) => setExportFilters({...exportFilters, startDate: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="endDate" className="form-label small">End Date</label>
                      <input 
                        id="endDate"
                        type="date" 
                        className="form-control form-control-sm"
                        value={exportFilters.endDate}
                        onChange={(e) => setExportFilters({...exportFilters, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {exportType === 'complaints' && (
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label htmlFor="statusFilter" className="form-label small">Status</label>
                        <select 
                          id="statusFilter"
                          className="form-select form-select-sm"
                          value={exportFilters.status}
                          onChange={(e) => setExportFilters({...exportFilters, status: e.target.value})}
                        >
                          <option value="">All Statuses</option>
                          <option value="NEW">New</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="categoryFilter" className="form-label small">Category</label>
                        <input 
                          id="categoryFilter"
                          type="text" 
                          className="form-control form-control-sm"
                          placeholder="Enter category"
                          value={exportFilters.category}
                          onChange={(e) => setExportFilters({...exportFilters, category: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="alert alert-info">
                <small>
                  <FaInfo className="me-2" />
                  Files will be downloaded instantly. No waiting required.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                data-bs-dismiss="modal"
                onClick={closeExportModal}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleInstantExport}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <FaDownload className="me-2" />
                    Download Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard