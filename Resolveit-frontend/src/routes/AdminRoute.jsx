import ProtectedRoute from './ProtectedRoute'

const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      {children}
    </ProtectedRoute>
  )
}

export default AdminRoute
