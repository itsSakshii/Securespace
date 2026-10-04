import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWearable } from '../context/WearableContext';
import { useIncident } from '../context/IncidentContext';
import { useProtectionLevel } from '../hooks/useProtectionLevel';

export default function MainLayout({ children }) {
  const { user, logout, isGuard } = useAuth();
  const { wearable } = useWearable();
  const { activeIncident } = useIncident();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const incidentOpen = !!activeIncident && !['RESOLVED', 'CANCELLED'].includes(activeIncident.status);
  const level = incidentOpen ? (activeIncident.protectionLevel || 'NORMAL') : 'NORMAL';
  const pl = useProtectionLevel(level);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = isGuard
    ? [{ to: '/guard/dashboard', label: 'Guard Dashboard' }, { to: '/history', label: 'History' }]
    : [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/wearable', label: 'Wearable' },
        { to: '/safety-zone', label: 'Safety Map' },
        { to: '/contacts', label: 'Contacts' },
        { to: '/history', label: 'History' },
      ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-lg">SafetyNet</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? 'bg-brand-light text-brand-dark'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >{label}</Link>
              ))}
              <Link to="/demo" className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors">
                Demo
              </Link>
            </nav>

            {/* Right: status + user */}
            <div className="flex items-center gap-3">
              {/* Protection badge */}
              {incidentOpen && (
                <span className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${pl.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${pl.dot} ${level === 'CRITICAL' ? 'animate-pulse' : ''}`} />
                  {level}
                </span>
              )}

              {/* Wearable status */}
              {wearable.connected && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {wearable.battery}%
                </span>
              )}

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm text-gray-700">{user?.name?.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {menuOpen && (
            <div className="md:hidden pb-3 pt-1 border-t border-gray-100">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >{label}</Link>
              ))}
              <Link to="/demo" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">Demo</Link>
              <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Sign Out</button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        SafetyNet — Adaptive Women's Safety Network · IndustrySolve Hackathon 2026, IIIT Delhi · Prototype
      </footer>
    </div>
  );
}
