import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="container text-center py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body py-5">
              <h1 className="display-1 text-muted">404</h1>
              <h2 className="mb-4">Page Not Found</h2>
              <div className="mb-4">
                <i className="bi bi-search display-4 text-muted mb-3"></i>
                <p className="lead">
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </div>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/public-complaints" className="btn btn-primary">
                  <i className="bi bi-house-door me-2"></i>
                  Go to Home
                </Link>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => window.history.back()}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
            </div>
          </div>
          
          <div className="card mt-4">
            <div className="card-body">
              <h5 className="mb-3">Quick Links</h5>
              <div className="row">
                <div className="col-md-4 mb-2">
                  <Link to="/public-complaints" className="btn btn-outline-primary w-100">
                    <i className="bi bi-eye me-1"></i>
                    Public Complaints
                  </Link>
                </div>
                <div className="col-md-4 mb-2">
                  <Link to="/login" className="btn btn-outline-success w-100">
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    Login
                  </Link>
                </div>
                <div className="col-md-4 mb-2">
                  <Link to="/register" className="btn btn-outline-info w-100">
                    <i className="bi bi-person-plus me-1"></i>
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound