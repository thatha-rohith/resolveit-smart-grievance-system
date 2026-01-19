import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicRoute from './routes/PublicRoute'
import AdminRoute from './routes/AdminRoute'
import EmployeeRoute from './routes/EmployeeRoute'
import Navbar from './components/Navbar'
import AutoEscalationMonitor from './components/AutoEscalationMonitor'

// User Pages
import Login from './pages/Login'
import Register from './pages/Register'
import ComplaintForm from './pages/ComplaintForm'
import MyComplaints from './pages/MyComplaints'
import PublicComplaints from './pages/PublicComplaints'
import ComplaintDetails from './pages/ComplaintDetails'
import RequestEmployee from './pages/RequestEmployee'
import UserDashboard from './pages/UserDashboard'

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import RequestSeniorEmployee from './pages/employee/RequestSeniorEmployee'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageComplaints from './pages/admin/ManageComplaints'
import ManageEmployees from './pages/admin/ManageEmployees'
import EmployeeRequests from './pages/admin/EmployeeRequests'
import SeniorRequests from './pages/admin/SeniorRequests'

// Senior Employee Pages
import SeniorDashboard from './pages/senior/SeniorDashboard'
import EscalatedComplaints from './pages/senior/EscalatedComplaints'

// Other Pages
import ExportHistory from './pages/ExportHistory'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <div className="container mt-4">
            <AutoEscalationMonitor />
            <Routes>
              {/* Public Routes (no auth required) */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              
              <Route path="/public-complaints" element={<PublicComplaints />} />
              
              {/* Protected Routes (auth required) */}
              <Route path="/submit" element={
                <ProtectedRoute>
                  <ComplaintForm />
                </ProtectedRoute>
              } />
              
              <Route path="/my-complaints" element={
                <ProtectedRoute>
                  <MyComplaints />
                </ProtectedRoute>
              } />
              
              {/* USER DASHBOARD */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/complaints/:id" element={
                <ProtectedRoute>
                  <ComplaintDetails />
                </ProtectedRoute>
              } />
              
              <Route path="/request-employee" element={
                <ProtectedRoute allowedRoles={['USER']}>
                  <RequestEmployee />
                </ProtectedRoute>
              } />

              {/* Employee Routes */}
              <Route path="/employee/dashboard" element={
                <EmployeeRoute>
                  <EmployeeDashboard />
                </EmployeeRoute>
              } />

              {/* SENIOR REQUEST FOR EMPLOYEES */}
              <Route path="/employee/request-senior" element={
                <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                  <RequestSeniorEmployee />
                </ProtectedRoute>
              } />

              {/* Senior Employee Routes */}
              <Route path="/senior/dashboard" element={
                <ProtectedRoute allowedRoles={['SENIOR_EMPLOYEE', 'ADMIN']}>
                  <SeniorDashboard />
                </ProtectedRoute>
              } />

              {/* ESCALATED COMPLAINTS ROUTE */}
              <Route path="/senior/escalated" element={
                <ProtectedRoute allowedRoles={['SENIOR_EMPLOYEE', 'ADMIN', 'EMPLOYEE']}>
                  <EscalatedComplaints />
                </ProtectedRoute>
              } />

              {/* Export Route */}
              <Route path="/export-history" element={
                <ProtectedRoute>
                  <ExportHistory />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="/admin/complaints" element={
                <AdminRoute>
                  <ManageComplaints />
                </AdminRoute>
              } />
              
              <Route path="/admin/employees" element={
                <AdminRoute>
                  <ManageEmployees />
                </AdminRoute>
              } />
              
              <Route path="/admin/employee-requests" element={
                <AdminRoute>
                  <EmployeeRequests />
                </AdminRoute>
              } />

              {/* SENIOR REQUESTS FOR ADMIN */}
              <Route path="/admin/senior-requests" element={
                <AdminRoute>
                  <SeniorRequests />
                </AdminRoute>
              } />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/public-complaints" />} />
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App