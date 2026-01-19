import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, complaintAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Chart from 'react-apexcharts'
import {
  FaChartBar, FaChartPie, FaList, FaClock,
  FaCheckCircle, FaExclamationTriangle, FaFilter,
  FaSync, FaEye, FaPlusCircle, FaChartLine,
  FaArrowUp, FaFileAlt, FaCalendarAlt, FaUsers,
  FaInbox, FaHeart, FaTag, FaUserCheck, FaPaperclip
} from 'react-icons/fa'

const UserDashboard = () => {
  const [stats, setStats] = useState(null)
  const [allComplaints, setAllComplaints] = useState([])
  const [recentComplaints, setRecentComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [filter])

  // Process complaints data to generate analytics
  const processedData = useMemo(() => {
    if (!allComplaints.length) {
      return {
        complaintsByCategory: {},
        complaintsByStatus: {},
        complaintsByDay: {},
        complaintsByUrgency: {},
        resolutionRate: 0,
        averageResolutionDays: null,
        totalComplaints: 0,
        resolvedComplaints: 0,
        newComplaints: 0,
        inProgressComplaints: 0,
        complaintsPastDue: 0
      }
    }

    const complaints = allComplaints.filter(c => {
      if (filter === 'all') return true;
      return c.status === filter;
    });

    // Complaints by category
    const complaintsByCategory = {};
    complaints.forEach(complaint => {
      const category = complaint.category || 'Uncategorized';
      complaintsByCategory[category] = (complaintsByCategory[category] || 0) + 1;
    });

    // Complaints by status
    const complaintsByStatus = {};
    complaints.forEach(complaint => {
      const status = complaint.status || 'UNKNOWN';
      complaintsByStatus[status] = (complaintsByStatus[status] || 0) + 1;
    });

    // Complaints by day (last 30 days)
    const complaintsByDay = {};
    const last30Days = [...Array(30)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    last30Days.forEach(date => {
      complaintsByDay[date] = 0;
    });

    complaints.forEach(complaint => {
      if (complaint.createdAt) {
        const date = new Date(complaint.createdAt).toISOString().split('T')[0];
        if (complaintsByDay[date] !== undefined) {
          complaintsByDay[date]++;
        }
      }
    });

    // Complaints by urgency
    const complaintsByUrgency = {};
    complaints.forEach(complaint => {
      const urgency = complaint.urgency || 'MEDIUM';
      complaintsByUrgency[urgency] = (complaintsByUrgency[urgency] || 0) + 1;
    });

    // Calculate performance metrics
    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;
    
    // Calculate past due complaints (assuming you have a dueDate field)
    const complaintsPastDue = complaints.filter(c => {
      if (!c.dueDate) return false;
      return new Date(c.dueDate) < new Date() && c.status !== 'RESOLVED' && c.status !== 'CLOSED';
    }).length;

    // Calculate average days to resolve
    let averageResolutionDays = null;
    const resolved = complaints.filter(c => 
      (c.status === 'RESOLVED' || c.status === 'CLOSED') && 
      c.createdAt && c.resolvedAt
    );
    
    if (resolved.length > 0) {
      const totalDays = resolved.reduce((sum, complaint) => {
        const created = new Date(complaint.createdAt);
        const resolvedDate = new Date(complaint.resolvedAt);
        const days = (resolvedDate - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      averageResolutionDays = totalDays / resolved.length;
    }

    return {
      complaintsByCategory,
      complaintsByStatus,
      complaintsByDay,
      complaintsByUrgency,
      resolutionRate,
      averageResolutionDays,
      totalComplaints,
      resolvedComplaints,
      newComplaints: complaints.filter(c => c.status === 'NEW').length,
      inProgressComplaints: complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'IN_PROGRESS').length,
      complaintsPastDue
    };
  }, [allComplaints, filter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [dashboardRes, complaintsRes] = await Promise.all([
        dashboardAPI.getUserDashboard(),
        complaintAPI.getMyComplaints()
      ])
      
      setStats(dashboardRes)
      
      // Store all complaints for processing
      const allComplaintsData = complaintsRes.data || complaintsRes || []
      setAllComplaints(allComplaintsData)
      
      // Filter for recent complaints display
      let filtered = allComplaintsData
      if (filter !== 'all') {
        filtered = filtered.filter(c => c.status === filter)
      }
      setRecentComplaints(filtered.slice(0, 5))
      
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
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
          <h1 className="h2 mb-2 text-primary">My Dashboard</h1>
          <p className="text-muted">Track your complaints and progress</p>
        </div>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={fetchDashboardData}>
            <FaSync className="me-2" /> Refresh
          </button>
          <Link to="/submit" className="btn btn-primary">
            <FaPlusCircle className="me-2" /> New Complaint
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row mb-4">
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card border-primary shadow">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="h3 mb-0 text-primary">{formatNumber(processedData.totalComplaints)}</div>
                  <div className="small text-muted">Total Complaints</div>
                </div>
                <div className="align-self-center">
                  <FaInbox className="fa-2x text-primary opacity-75" />
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
                  <div className="h3 mb-0 text-info">{formatNumber(processedData.newComplaints)}</div>
                  <div className="small text-muted">New Complaints</div>
                </div>
                <div className="align-self-center">
                  <FaExclamationTriangle className="fa-2x text-info opacity-75" />
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
                  <div className="h3 mb-0 text-warning">{formatNumber(processedData.inProgressComplaints)}</div>
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
                  <div className="h3 mb-0 text-success">{formatNumber(processedData.resolvedComplaints)}</div>
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
                  <div className="h3 mb-0 text-danger">{formatNumber(processedData.complaintsPastDue)}</div>
                  <div className="small text-muted">Past Due</div>
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
                    {processedData.averageResolutionDays ? 
                      `${processedData.averageResolutionDays.toFixed(1)}d` : 'N/A'}
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
              {Object.keys(processedData.complaintsByCategory).length > 0 ? (
                <Chart
                  options={{
                    chart: { 
                      type: 'pie',
                      toolbar: { show: false }
                    },
                    labels: Object.keys(processedData.complaintsByCategory),
                    legend: { 
                      position: 'bottom',
                      fontSize: '12px'
                    },
                    colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#6c757d', '#20c997', '#fd7e14', '#6610f2'],
                    responsive: [{
                      breakpoint: 480,
                      options: {
                        chart: { width: 200 },
                        legend: { position: 'bottom' }
                      }
                    }]
                  }}
                  series={Object.values(processedData.complaintsByCategory)}
                  type="pie"
                  height="300"
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No category data available</p>
                  <Link to="/submit" className="btn btn-sm btn-primary mt-2">
                    Submit your first complaint
                  </Link>
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
              {Object.keys(processedData.complaintsByStatus).length > 0 ? (
                <Chart
                  options={{
                    chart: { 
                      type: 'bar',
                      toolbar: { show: false }
                    },
                    plotOptions: {
                      bar: { 
                        horizontal: false, 
                        columnWidth: '60%',
                        borderRadius: 4
                      }
                    },
                    xaxis: {
                      categories: Object.keys(processedData.complaintsByStatus).map(status => {
                        const statusMap = {
                          'NEW': 'New',
                          'UNDER_REVIEW': 'In Progress',
                          'IN_PROGRESS': 'In Progress',
                          'RESOLVED': 'Resolved',
                          'CLOSED': 'Closed',
                          'REJECTED': 'Rejected'
                        };
                        return statusMap[status] || status;
                      })
                    },
                    colors: ['#4e73df'],
                    dataLabels: {
                      enabled: true,
                      formatter: function(val) {
                        return val;
                      },
                      offsetY: -20,
                      style: {
                        fontSize: '12px',
                        colors: ["#304758"]
                      }
                    },
                    yaxis: {
                      title: { text: 'Number of Complaints' }
                    }
                  }}
                  series={[{
                    name: 'Complaints',
                    data: Object.values(processedData.complaintsByStatus)
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
              {Object.values(processedData.complaintsByDay).some(count => count > 0) ? (
                <Chart
                  options={{
                    chart: { 
                      type: 'line',
                      toolbar: { show: false }
                    },
                    xaxis: {
                      categories: Object.keys(processedData.complaintsByDay),
                      labels: {
                        formatter: function(value) {
                          const date = new Date(value);
                          return date.getDate() === 1 || date.getDate() === 15 ? 
                            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                        }
                      }
                    },
                    stroke: { 
                      curve: 'smooth', 
                      width: 3 
                    },
                    colors: ['#e74a3b'],
                    markers: { size: 4 },
                    grid: {
                      borderColor: '#f1f1f1',
                    },
                    tooltip: {
                      x: {
                        formatter: function(value) {
                          return new Date(value).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                        }
                      }
                    },
                    yaxis: {
                      title: { text: 'Number of Complaints' },
                      min: 0
                    }
                  }}
                  series={[{
                    name: 'Complaints Submitted',
                    data: Object.values(processedData.complaintsByDay)
                  }]}
                  type="line"
                  height="300"
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No complaints in the last 30 days</p>
                  <Link to="/submit" className="btn btn-sm btn-primary mt-2">
                    Submit a complaint
                  </Link>
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
                  {Object.keys(processedData.complaintsByUrgency).length > 0 ? (
                    <div className="list-group list-group-flush">
                      {Object.entries(processedData.complaintsByUrgency).map(([urgency, count]) => (
                        <div key={urgency} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>
                            <span className={`badge ${
                              urgency === 'HIGH' ? 'bg-danger' : 
                              urgency === 'MEDIUM' ? 'bg-warning' : 'bg-info'
                            } me-2`}>
                              {urgency}
                            </span>
                          </span>
                          <span className="font-weight-bold">{count} complaints</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No urgency data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card shadow">
                <div className="card-header bg-white border-bottom">
                  <h6 className="m-0 font-weight-bold text-primary">
                    <FaUsers className="me-2" />
                    My Performance Metrics
                  </h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <small className="text-muted">Resolution Rate</small>
                    <div className="h4 text-success">
                      {processedData.resolutionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Total Complaints</small>
                    <div className="h4 text-primary">{processedData.totalComplaints}</div>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted">Avg. Resolution Time</small>
                    <div className="h4 text-info">
                      {processedData.averageResolutionDays ? 
                        `${processedData.averageResolutionDays.toFixed(1)} days` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <small className="text-muted">Past Due Complaints</small>
                    <div className="h4 text-danger">{processedData.complaintsPastDue}</div>
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
                <FaFilter className="me-2" />
                Filter & Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <h6 className="small font-weight-bold text-muted mb-3">Filter by Status</h6>
                <div className="d-grid gap-2">
                  <button 
                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                    onClick={() => setFilter('all')}
                  >
                    All ({processedData.totalComplaints})
                  </button>
                  <button 
                    className={`btn ${filter === 'NEW' ? 'btn-info' : 'btn-outline-info'} btn-sm`}
                    onClick={() => setFilter('NEW')}
                  >
                    New ({processedData.newComplaints})
                  </button>
                  <button 
                    className={`btn ${filter === 'UNDER_REVIEW' ? 'btn-warning' : 'btn-outline-warning'} btn-sm`}
                    onClick={() => setFilter('UNDER_REVIEW')}
                  >
                    In Progress ({processedData.inProgressComplaints})
                  </button>
                  <button 
                    className={`btn ${filter === 'RESOLVED' ? 'btn-success' : 'btn-outline-success'} btn-sm`}
                    onClick={() => setFilter('RESOLVED')}
                  >
                    Resolved ({processedData.resolvedComplaints})
                  </button>
                </div>
              </div>
              
              <div className="border-top pt-3">
                <h6 className="small font-weight-bold text-muted mb-3">Quick Actions</h6>
                <div className="d-grid gap-2">
                  <Link to="/submit" className="btn btn-primary btn-sm">
                    <FaPlusCircle className="me-2" />
                    Submit New Complaint
                  </Link>
                  <Link to="/my-complaints" className="btn btn-outline-primary btn-sm">
                    <FaList className="me-2" />
                    View All Complaints
                  </Link>
                  <Link to="/profile" className="btn btn-outline-secondary btn-sm">
                    <FaUsers className="me-2" />
                    My Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card shadow">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">
              Recent Complaints ({recentComplaints.length})
            </h6>
            <Link to="/my-complaints" className="btn btn-sm btn-outline-primary">
              View All
            </Link>
          </div>
        </div>
        <div className="card-body">
          {recentComplaints.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">No complaints found</p>
              <Link to="/submit" className="btn btn-primary mt-2">
                <FaPlusCircle className="me-2" /> Submit Your First Complaint
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map(complaint => (
                    <tr key={complaint.id}>
                      <td className="font-weight-bold">#{complaint.id}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>
                        {complaint.title}
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {complaint.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          complaint.urgency === 'HIGH' ? 'bg-danger' : 
                          complaint.urgency === 'MEDIUM' ? 'bg-warning' : 'bg-info'
                        }`}>
                          {complaint.urgency}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          complaint.status === 'NEW' ? 'bg-info' :
                          complaint.status === 'UNDER_REVIEW' || complaint.status === 'IN_PROGRESS' ? 'bg-warning' : 
                          complaint.status === 'RESOLVED' ? 'bg-success' : 'bg-secondary'
                        }`}>
                          {complaint.status === 'UNDER_REVIEW' ? 'In Progress' : complaint.status}
                        </span>
                      </td>
                      <td>
                        {formatDate(complaint.createdAt)}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link 
                            to={`/complaints/${complaint.id}`}
                            className="btn btn-sm btn-primary"
                          >
                            <FaEye className="me-1" /> View
                          </Link>
                          {(complaint.likeCount > 0) && (
                            <span className="badge bg-danger">
                              <FaHeart className="me-1" /> {complaint.likeCount}
                            </span>
                          )}
                          {(complaint.attachmentCount > 0) && (
                            <span className="badge bg-secondary">
                              <FaPaperclip className="me-1" /> {complaint.attachmentCount}
                            </span>
                          )}
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

      {/* Additional Insights */}
      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <FaHeart className="text-danger fa-2x mb-3" />
              <h5>Total Likes</h5>
              <h3 className="text-danger">
                {allComplaints.reduce((total, c) => total + (c.likeCount || 0), 0)}
              </h3>
              <p className="text-muted small">Across all your complaints</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <FaPaperclip className="text-info fa-2x mb-3" />
              <h5>Total Attachments</h5>
              <h3 className="text-info">
                {allComplaints.reduce((total, c) => total + (c.attachmentCount || 0), 0)}
              </h3>
              <p className="text-muted small">Files attached to complaints</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body text-center">
              <FaUserCheck className="text-success fa-2x mb-3" />
              <h5>Assigned Complaints</h5>
              <h3 className="text-success">
                {allComplaints.filter(c => c.assignedEmployeeName).length}
              </h3>
              <p className="text-muted small">With assigned employees</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard