import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AppLayout from './components/AppLayout';
import AuthLayout from './pages/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/admin/UsersPage';

// Racing pages
import TournamentsPage from './pages/racing/TournamentsPage';
import TournamentDetailPage from './pages/racing/TournamentDetailPage';
import RaceDetailPage from './pages/racing/RaceDetailPage';
import AdminTournamentPage from './pages/racing/AdminTournamentPage';
import AdminRacePage from './pages/racing/AdminRacePage';
import HorseSchedulePage from './pages/racing/HorseSchedulePage';

import { AdminRoute, ProtectedRoute } from './routes/Guards';

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

              {/* Racing — public views */}
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/races/:id" element={<RaceDetailPage />} />

              {/* Racing — Horse Owner */}
              <Route path="/my-horses/schedule" element={<HorseSchedulePage />} />

              {/* Racing — Admin */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/tournaments/new" element={<AdminTournamentPage />} />
                <Route path="/admin/tournaments/:id/edit" element={<AdminTournamentPage />} />
                <Route path="/admin/races/new" element={<AdminRacePage />} />
                <Route path="/admin/races/:id/edit" element={<AdminRacePage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
