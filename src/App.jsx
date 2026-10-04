import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WearableProvider } from './context/WearableContext';
import { IncidentProvider } from './context/IncidentContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WearablePage from './pages/WearablePage';
import SafetyZonePage from './pages/SafetyZonePage';
import IncidentPage from './pages/IncidentPage';
import ContactsPage from './pages/ContactsPage';
import HistoryPage from './pages/HistoryPage';
import GuardDashboardPage from './pages/GuardDashboardPage';
import GuardIncidentPage from './pages/GuardIncidentPage';
import DemoPage from './pages/DemoPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function GuardRoute({ children }) {
  const { isAuthenticated, isGuard, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isGuard) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <WearableProvider>
          <IncidentProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/demo" element={<DemoPage />} />

                {/* User Protected */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/wearable" element={<ProtectedRoute><WearablePage /></ProtectedRoute>} />
                <Route path="/safety-zone" element={<ProtectedRoute><SafetyZonePage /></ProtectedRoute>} />
                <Route path="/incident/:id" element={<ProtectedRoute><IncidentPage /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

                {/* Guard Protected */}
                <Route path="/guard/dashboard" element={<GuardRoute><GuardDashboardPage /></GuardRoute>} />
                <Route path="/guard/incident/:id" element={<GuardRoute><GuardIncidentPage /></GuardRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </IncidentProvider>
        </WearableProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
