import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const ManageEmployees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await adminAPI.getEmployees()
      console.log('Employees response:', response)
      
      // Handle different response formats
      const employeesData = Array.isArray(response) ? response : 
                           response?.data || response || []
      
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
      setError('Failed to load employees')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">Loading employees...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Manage Employees</h2>
          <p className="text-muted mb-0">View and manage all employees in the system</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={fetchEmployees}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          <Link to="/admin/dashboard" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-people me-2"></i>
              All Employees
            </h5>
            <span className="badge bg-primary">
              Total: {employees.length}
            </span>
          </div>
        </div>
        <div className="card-body">
          {employees.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-person-slash display-1 text-muted mb-3"></i>
              <h4>No employees found</h4>
              <p className="text-muted">
                There are no employees in the system yet
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <span className="badge bg-secondary">#{employee.id}</span>
                      </td>
                      <td>
                        <strong>{employee.fullName}</strong>
                      </td>
                      <td>{employee.email}</td>
                      <td>
                        <span className={`badge ${
                          employee.role === 'ADMIN' ? 'bg-danger' : 'bg-success'
                        }`}>
                          {employee.role}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary">
                            <i className="bi bi-eye"></i>
                          </button>
                          <button className="btn btn-outline-warning">
                            <i className="bi bi-pencil"></i>
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
        
        <div className="card-footer text-muted">
          <small>
            <i className="bi bi-info-circle me-1"></i>
            Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </small>
        </div>
      </div>
    </div>
  )
}

export default ManageEmployees