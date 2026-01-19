import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { 
  FaShieldAlt, FaBars, FaTimes, FaUserCircle, FaSignOutAlt, 
  FaChartLine, FaListAlt, FaPlus, FaUserTie, FaUsersCog, 
  FaBriefcase, FaLayerGroup, FaChevronDown, FaSignInAlt, FaUserPlus
} from 'react-icons/fa'
import './Navbar.css'

const Navbar = () => {
  const { user, logout, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsProfileOpen(false)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Hide navbar on auth pages if not logged in
  if ((location.pathname === '/login' || location.pathname === '/register') && !isAuthenticated) {
    return null
  }

  if (loading) {
    return <div className="nav-skeleton"></div>
  }

  const NavItem = ({ to, icon: Icon, label, badge }) => (
    <Link 
      to={to} 
      className={`nav-item-link ${location.pathname === to ? 'active' : ''}`}
    >
      {Icon && <Icon className="nav-icon" />}
      <span>{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </Link>
  )

  return (
    <nav className={`saas-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand">
          <div className="brand-icon-box">
            <FaShieldAlt />
          </div>
          <div className="brand-text">
            <span className="brand-name">ResolveIt</span>
            <span className="brand-suffix">Enterprise</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-desktop-menu">
          <NavItem to="/public-complaints" icon={FaLayerGroup} label="Public Feed" />
          
          {isAuthenticated && user && (
            <>
              {/* USER ROLE LINKS */}
              {user.role === 'USER' && (
                <>
                  <NavItem to="/dashboard" icon={FaChartLine} label="Dashboard" />
                  <NavItem to="/my-complaints" icon={FaListAlt} label="My Tickets" />
                  <NavItem to="/submit" icon={FaPlus} label="New Ticket" />
                  <NavItem to="/request-employee" icon={FaUserTie} label="Join Staff" />
                </>
              )}

              {/* EMPLOYEE ROLE LINKS */}
              {user.role === 'EMPLOYEE' && (
                <>
                  <NavItem to="/employee/dashboard" icon={FaBriefcase} label="Workspace" />
                  <NavItem to="/employee/request-senior" icon={FaUserTie} label="Request Senior" />
                </>
              )}

              {/* SENIOR ROLE LINKS */}
              {user.role === 'SENIOR_EMPLOYEE' && (
                <>
                  <NavItem to="/senior/dashboard" icon={FaBriefcase} label="Senior Desk" />
                  <NavItem to="/senior/escalated" icon={FaListAlt} label="Escalations" />
                </>
              )}

              {/* ADMIN ROLE LINKS */}
              {user.role === 'ADMIN' && (
                <>
                  <NavItem to="/admin/dashboard" icon={FaChartLine} label="Admin" />
                  <NavItem to="/admin/complaints" icon={FaListAlt} label="All Tickets" />
                  <NavItem to="/admin/employees" icon={FaUsersCog} label="Staff" />
                  <div className="nav-group-divider"></div>
                  <NavItem to="/admin/employee-requests" label="Staff Reqs" badge="!" />
                  <NavItem to="/admin/senior-requests" label="Senior Reqs" badge="!" />
                </>
              )}
            </>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="nav-actions">
          {isAuthenticated && user ? (
            <div className="profile-menu-container" ref={profileRef}>
              <button 
                className={`profile-trigger ${isProfileOpen ? 'active' : ''}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="avatar-circle">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info-mini">
                  <span className="profile-name">{user.fullName || 'User'}</span>
                  <span className="profile-role">{user.role.replace('_', ' ').toLowerCase()}</span>
                </div>
                <FaChevronDown className="chevron-icon" />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="nav-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="user-details">
                      <strong>{user.fullName || 'User'}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-body">
                    {user.role !== 'EMPLOYEE' && (
                      <Link to="/dashboard" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                        <FaChartLine /> Dashboard
                      </Link>
                    )}
                    <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      <FaUserCircle /> My Profile
                    </Link>
                  </div>

                  <div className="dropdown-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                      <FaSignOutAlt /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-nav-outline">
                <FaSignInAlt /> Login
              </Link>
              <Link to="/register" className="btn-nav-primary">
                <FaUserPlus /> Register
              </Link>
            </div>
          )}

          {/* Mobile Toggle */}
          <button 
            className="mobile-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <div className="mobile-nav-links">
             <NavItem to="/public-complaints" icon={FaLayerGroup} label="Public Feed" />
             
             {isAuthenticated && user && (
               <>
                 <div className="mobile-divider">My Workspace</div>
                 {user.role === 'USER' && (
                   <>
                     <NavItem to="/dashboard" icon={FaChartLine} label="Dashboard" />
                     <NavItem to="/my-complaints" icon={FaListAlt} label="My Tickets" />
                     <NavItem to="/submit" icon={FaPlus} label="New Ticket" />
                     <NavItem to="/request-employee" icon={FaUserTie} label="Join Staff" />
                   </>
                 )}
                 {user.role === 'EMPLOYEE' && (
                    <>
                      <NavItem to="/employee/dashboard" icon={FaBriefcase} label="Workspace" />
                      <NavItem to="/employee/request-senior" icon={FaUserTie} label="Request Senior" />
                    </>
                 )}
                 {user.role === 'SENIOR_EMPLOYEE' && (
                    <>
                      <NavItem to="/senior/dashboard" icon={FaBriefcase} label="Senior Desk" />
                      <NavItem to="/senior/escalated" icon={FaListAlt} label="Escalations" />
                    </>
                 )}
                 {user.role === 'ADMIN' && (
                    <>
                      <NavItem to="/admin/dashboard" icon={FaChartLine} label="Admin Dashboard" />
                      <NavItem to="/admin/complaints" icon={FaListAlt} label="Manage Tickets" />
                      <NavItem to="/admin/employees" icon={FaUsersCog} label="Manage Staff" />
                      <NavItem to="/admin/employee-requests" label="Staff Requests" />
                      <NavItem to="/admin/senior-requests" label="Senior Requests" />
                    </>
                 )}
               </>
             )}
          </div>
          
          {isAuthenticated && (
            <div className="mobile-footer">
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <FaSignOutAlt /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar