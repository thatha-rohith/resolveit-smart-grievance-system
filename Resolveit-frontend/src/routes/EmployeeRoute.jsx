import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const EmployeeRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />
  }

  if (user.role !== 'EMPLOYEE') {
    return <Navigate to="/public-complaints" />
  }

  return children
}

export default EmployeeRoute