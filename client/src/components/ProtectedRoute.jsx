import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect them to their proper dashboard if they try to access the wrong one
    if (user.role === 'Restaurant') return <Navigate to="/donor" replace />;
    if (user.role === 'NGO') return <Navigate to="/receiver" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  }

  return children;
}
