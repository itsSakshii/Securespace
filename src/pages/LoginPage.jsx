import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { DEMO_MODE } from '../config';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'GENERAL_GUARD' || user.role === 'RAPID_GUARD') {
        navigate('/guard/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Check credentials.'));
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn(form.email, form.password);
  };

  const fillDemo = (email) => setForm({ email, password: 'password123' });
  // One-click demo login: signs in and redirects straight to the role's dashboard.
  const quickLogin = (email) => { fillDemo(email); signIn(email, 'password123'); };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-2xl text-gray-900">SafetyNet</span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Sign in to your account</p>
          {DEMO_MODE && (
            <span className="inline-block mt-2 text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
              DEMO MODE · any email &amp; password works
            </span>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account? <Link to="/register" className="text-brand font-medium hover:underline">Register</Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2">🎯 Demo Credentials</p>
          <div className="space-y-1.5">
            {[
              { label: 'User (Wearable)', email: 'user@demo.com' },
              { label: 'General Guard', email: 'guard1@demo.com' },
              { label: 'Rapid Guard', email: 'rapidguard@demo.com' },
            ].map(({ label, email }) => (
              <button key={email} type="button" onClick={() => quickLogin(email)} disabled={loading}
                className="w-full text-left px-3 py-1.5 bg-white rounded-lg text-xs hover:bg-blue-50 border border-blue-100 flex justify-between items-center disabled:opacity-60">
                <span className="text-gray-700">{label}</span>
                <span className="text-blue-600 font-mono">{email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-2">Click a role to sign in instantly (password: password123)</p>
        </div>
      </div>
    </div>
  );
}
