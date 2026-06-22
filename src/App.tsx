import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AppLayout from './components/AppLayout';
import AuthLayout from './pages/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import { AdminRoute, ProtectedRoute } from './routes/Guards';

/** Sends already-logged-in users away from the auth pages. */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
