import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, complaintAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { 
  FaChartLine, FaClock, FaExclamationTriangle, FaCheckCircle, 
  FaUserCheck, FaArrowUp, FaFilter, FaCalendar, FaDownload,
  FaUsers, FaComments, FaPaperclip, FaEye, FaSync
} from 'react-icons/fa'
import Chart from 'react-apexcharts'

const SeniorDashboard = () => {
  const [stats, setStats] = useState(null)
  const [escalatedComplaints, setEscalatedComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch dashboard stats and escalated complaints in parallel
      const [dashboardRes, escalatedRes] = await Promise.all([
        dashboardAPI.getSeniorDashboard(),
        complaintAPI.getEscalatedComplaints()
      ])

      // Check if dashboard response has error
      if (dashboardRes.error) {
        throw new Error(dashboardRes.error + ': ' + (dashboardRes.message || ''))
      }

      // Set dashboard stats
      setStats(dashboardRes)

      // Handle escalated complaints response
      // Backend returns: { success: true, data: [...], count: X, userRole: 'SENIOR_EMPLOYEE' }
      if (escalatedRes && escalatedRes.success === true) {
        setEscalatedComplaints(escalatedRes.data || [])
      } else if (Array.isArray(escalatedRes)) {
        // Fallback if response is already an array
        setEscalatedComplaints(escalatedRes)
      } else if (escalatedRes.data && Array.isArray(escalatedRes.data)) {
        // Another fallback pattern
        setEscalatedComplaints(escalatedRes.data)
      } else {
        setEscalatedComplaints([])
      }

    } catch (err) {
      console.error('Dashboard error:', err)
      setError(err.message || 'Failed to load dashboard data. Please try again.')
      setStats(null)
      setEscalatedComplaints([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Invalid date'
    }
  }

  const getStatusBadgeClass = (status) => {
    if (!status) return 'badge bg-secondary'
    
    switch(status.toUpperCase()) {
      case 'NEW': return 'badge bg-info';
      case 'UNDER_REVIEW': return 'badge bg-warning';
      case 'RESOLVED': return 'badge bg-success';
      default: return 'badge bg-secondary';
    }
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'
    return status.replace('_', ' ')
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="ms-3 text-muted">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-2 text-primary">Senior Employee Dashboard</h1>
          <p className="text-muted">
            Welcome back, <strong>{user?.fullName}</strong> 
            {user?.role && <span className="ms-2 badge bg-info">{user.role.replace('_', ' ')}</span>}
          </p>
        </div>
        <div>
          <button 
            className="btn btn-outline-primary me-2" 
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} /> 
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/public-complaints" className="btn btn-primary">
            <FaEye className="me-2" /> View Public Complaints
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <FaExclamationTriangle className="me-2" />
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Assigned
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.totalComplaints || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <FaUsers className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Escalated to Me
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {escalatedComplaints.length}
                  </div>
                </div>
                <div className="col-auto">
                  <FaArrowUp className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    In Progress
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.inProgressComplaints || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <FaClock className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Resolved
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats?.resolvedComplaints || 0}
                  </div>
                </div>
                <div className="col-auto">
                  <FaCheckCircle className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Only show if we have data */}
      {(stats?.complaintsByCategory || stats?.complaintsByStatus) && (
        <div className="row mb-4">
          {stats.complaintsByCategory && Object.keys(stats.complaintsByCategory).length > 0 && (
            <div className="col-xl-6 col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    Complaints by Category
                  </h6>
                </div>
                <div className="card-body">
                  <Chart
                    options={{
                      chart: { type: 'donut' },
                      labels: Object.keys(stats.complaintsByCategory),
                      legend: { position: 'bottom' },
                      colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796']
                    }}
                    series={Object.values(stats.complaintsByCategory)}
                    type="donut"
                    height="300"
                  />
                </div>
              </div>
            </div>
          )}

          {stats.complaintsByStatus && Object.keys(stats.complaintsByStatus).length > 0 && (
            <div className="col-xl-6 col-lg-6">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold text-primary">
                    Complaints by Status
                  </h6>
                </div>
                <div className="card-body">
                  <Chart
                    options={{
                      chart: { type: 'bar' },
                      plotOptions: {
                        bar: { horizontal: true, borderRadius: 4 }
                      },
                      xaxis: {
                        categories: Object.keys(stats.complaintsByStatus).map(s => s.replace('_', ' '))
                      },
                      colors: ['#4e73df']
                    }}
                    series={[{
                      name: 'Count',
                      data: Object.values(stats.complaintsByStatus)
                    }]}
                    type="bar"
                    height="300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Escalated Complaints */}
      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">
            <FaArrowUp className="me-2" />
            Escalated Complaints ({escalatedComplaints.length})
          </h6>
          <span className="badge bg-info">{user?.role?.replace('_', ' ')} View</span>
        </div>
        <div className="card-body">
          {escalatedComplaints.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3">
                <FaArrowUp className="fa-3x text-muted" />
              </div>
              <p className="text-muted">No escalated complaints assigned to you</p>
              <button className="btn btn-outline-primary" onClick={fetchDashboardData}>
                <FaSync className="me-2" /> Refresh
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Escalated On</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escalatedComplaints.map(complaint => (
                    <tr key={complaint.id}>
                      <td>
                        <span className="badge bg-dark">#{complaint.id}</span>
                      </td>
                      <td>
                        <strong>{complaint.title}</strong>
                        <div className="small text-muted">
                          {complaint.description?.substring(0, 60)}...
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {complaint.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(complaint.status)}>
                          {formatStatus(complaint.status)}
                        </span>
                      </td>
                      <td>
                        <small>{formatDate(complaint.escalationDate)}</small>
                      </td>
                      <td>
                        <small className="text-muted">
                          {complaint.escalationReason || 'Auto-escalated (No reason provided)'}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link 
                            to={`/complaints/${complaint.id}`}
                            className="btn btn-primary"
                            title="View details"
                          >
                            <FaEye />
                          </Link>
                          <Link 
                            to={`/employee/dashboard`}
                            className="btn btn-outline-info"
                            title="Manage"
                          >
                            <FaUserCheck />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics & Quick Actions */}
      <div className="row">
        <div className="col-lg-6">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaChartLine className="me-2" />
                Performance Metrics
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <div className="h2 mb-0 text-info">
                        {stats?.averageResolutionTime ? 
                          `${stats.averageResolutionTime.toFixed(1)}h` : '0h'}
                      </div>
                      <small className="text-muted">Avg. Resolution Time</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <div className="h2 mb-0 text-warning">{stats?.complaintsPastDue || 0}</div>
                      <small className="text-muted">Past Due Complaints</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <div className="h2 mb-0 text-success">
                        {stats?.assignedToMe || 0}
                      </div>
                      <small className="text-muted">Assigned to Me</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <div className="card bg-light">
                    <div className="card-body text-center">
                      <div className="h2 mb-0 text-danger">
                        {stats?.newComplaints || 0}
                      </div>
                      <small className="text-muted">New Complaints</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">
                <FaCalendar className="me-2" />
                Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/senior/escalated" className="btn btn-warning">
                  <FaArrowUp className="me-2" />
                  View All Escalated Complaints
                </Link>
                <Link to="/employee/dashboard" className="btn btn-info">
                  <FaUserCheck className="me-2" />
                  Go to Employee Dashboard
                </Link>
                <button 
                  className="btn btn-outline-primary" 
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh Dashboard'}
                </button>
                <Link to="/export-history" className="btn btn-outline-success">
                  <FaDownload className="me-2" />
                  Export Reports
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-center text-muted small">
        <p>Last updated: {new Date().toLocaleString()}</p>
        <p>Showing data for: Senior Employee Dashboard</p>
      </div>
    </div>
  )
}

export default SeniorDashboard