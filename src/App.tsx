import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AppLayout from './components/AppLayout';
import AuthLayout from './pages/AuthLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import HorsesPage from './pages/HorsesPage';
import UsersPage from './pages/admin/UsersPage';
import AdminEntriesPage from './pages/admin/AdminEntriesPage';
import JockeysPage from './pages/admin/JockeysPage';
import { AdminRoute, HorseOwnerRoute, JockeyRoute, ProtectedRoute } from './routes/Guards';
import AssignRefereePage from './pages/racing/AssignRefereePage';
import HorseInspectionPage from './pages/racing/HorseInspectionPage';
import MonitorRacePage from './pages/racing/MonitorRacePage';
import ViolationPage from './pages/racing/ViolationPage';
import ConfirmResultPage from './pages/racing/ConfirmResultPage';
import RaceReportPage from './pages/racing/RaceReportPage';
// Jockey management pages (FR-16 → FR-22)
import SendInvitationPage from './pages/jockey/SendInvitationPage';
import ManageInvitationsPage from './pages/jockey/ManageInvitationsPage';
import MyInvitationsPage from './pages/jockey/MyInvitationsPage';
import MyAssignedRacesPage from './pages/jockey/MyAssignedRacesPage';

// Racing pages (FR-09 → FR-15)
import TournamentsPage from './pages/racing/TournamentsPage';
import TournamentDetailPage from './pages/racing/TournamentDetailPage';
import RaceDetailPage from './pages/racing/RaceDetailPage';
import AdminTournamentPage from './pages/racing/AdminTournamentPage';
import AdminRacePage from './pages/racing/AdminRacePage';
import HorseSchedulePage from './pages/racing/HorseSchedulePage';

// Predition pages (FR-33 → FR-36)
import PredictionsPage from './pages/PredictionsPage';
import AdminPredictionsPage from './pages/admin/AdminPredictionsPage';

// Racing results page (FR-29 → FR-32)
import RacingResultsPage from './pages/RacingResultsPage';

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/horses" element={<HorsesPage />} />

              {/* Racing — public views (FR-11/12) */}
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/races/:id" element={<RaceDetailPage />} />

              {/* Racing — Horse Owner (FR-14/15) */}
              <Route path="/my-horses/schedule" element={<HorseSchedulePage />} />

              {/* Racing — results / officiating */}
              <Route path="/racing-results" element={<RacingResultsPage />} />
              <Route path="/racing/assign-referee" element={<AssignRefereePage />} />
              <Route path="/racing/inspection" element={<HorseInspectionPage />} />
              <Route path="/racing/monitor" element={<MonitorRacePage />} />
              <Route path="/racing/violations" element={<ViolationPage />} />
              <Route path="/racing/confirm-result" element={<ConfirmResultPage />} />
              <Route path="/racing/report" element={<RaceReportPage />} />

              {/* ---- FR-16 + FR-17 + FR-20: HorseOwner only ---- */}
              <Route element={<HorseOwnerRoute />}>
                <Route path="/jockey/send-invitation" element={<SendInvitationPage />} />
                <Route path="/jockey/manage-invitations" element={<ManageInvitationsPage />} />
              </Route>

              {/* ---- FR-18 + FR-19 + FR-21: Jockey only ---- */}
              <Route element={<JockeyRoute />}>
                <Route path="/jockey/my-invitations" element={<MyInvitationsPage />} />
                <Route path="/jockey/my-races" element={<MyAssignedRacesPage />} />
              </Route>

              {/* ---- FR-33 → FR-36: Prediction ---- */}
              <Route path="/predictions" element={<PredictionsPage />} />

              {/* ---- Admin only ---- */}
              <Route element={<AdminRoute />}>
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/entries" element={<AdminEntriesPage />} />
                <Route path="/admin/jockeys" element={<JockeysPage />} />
                <Route path="/admin/predictions" element={<AdminPredictionsPage />} />
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
