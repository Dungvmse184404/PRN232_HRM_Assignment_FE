import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Requires an authenticated user; redirects to /login otherwise. */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Requires the Admin role; sends non-admins back to the dashboard. */
export function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Requires the HorseOwner role. */
export function HorseOwnerRoute() {
  const { user } = useAuth();
  if (!user?.roles.includes('HorseOwner')) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Requires the Jockey role. */
export function JockeyRoute() {
  const { user } = useAuth();
  if (!user?.roles.includes('Jockey')) return <Navigate to="/" replace />;
  return <Outlet />;
}
