import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { responderApi, incidentApi } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import MainLayout from '../layouts/MainLayout';
import ProtectionLevel from '../components/ProtectionLevel';
import SafetyZoneMap from '../components/SafetyZoneMap';
import { useGeolocation } from '../hooks/useGeolocation';

export default function GuardDashboardPage() {
  const { user } = useAuth();
  const { on, off, joinGuardRoom } = useSocket();
  const { position } = useGeolocation();
  const navigate = useNavigate();

  const [availableIncidents, setAvailableIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [availability, setAvailability] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    if (user) {
      joinGuardRoom(user._id);
      fetchDashboardData();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    const handleNewIncident = () => fetchDashboardData();
    const handleIncidentUpdate = () => fetchDashboardData();

    on('responder_notified', handleNewIncident);
    on('incident_updated', handleIncidentUpdate);
    on('incident_resolved', handleIncidentUpdate);

    return () => {
      off('responder_notified', handleNewIncident);
      off('incident_updated', handleIncidentUpdate);
      off('incident_resolved', handleIncidentUpdate);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [activeRes, availableRes, profileRes] = await Promise.all([
        responderApi.getActiveIncidents(),
        responderApi.getAvailableIncidents(),
        responderApi.getProfile()
      ]);

      const active = activeRes.data.incidents[0] || null;
      setActiveIncident(active);
      setAvailableIncidents(availableRes.data.incidents || []);
      setAvailability(profileRes.data.responder?.availability ?? true);
      
      if (active) {
        navigate(`/guard/incident/${active.incidentId}`);
      }
    } catch (err) {
      console.error('Error fetching guard data', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      const res = await responderApi.updateAvailability({ availability: !availability });
      setAvailability(res.data.responder.availability);
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  const handleAccept = async (incidentId) => {
    setAcceptingId(incidentId);
    try {
      await incidentApi.accept(incidentId);
      navigate(`/guard/incident/${incidentId}`);
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to accept incident'));
      fetchDashboardData();
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Responder Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.role.replace('_', ' ')} · {user?.name}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <button 
              onClick={toggleAvailability}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${availability ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${availability ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-bold ${availability ? 'text-green-600' : 'text-gray-500'}`}>
              {availability ? 'AVAILABLE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Incidents List */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Active Alerts</h2>
            
            {!availability && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500">
                You are currently offline. Toggle your status to receive alerts.
              </div>
            )}

            {availability && loading && (
              <div className="text-center py-8 text-gray-400">Loading alerts...</div>
            )}

            {availability && !loading && availableIncidents.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <span className="text-4xl block mb-3">🛡️</span>
                <p className="text-green-800 font-medium text-lg">No active incidents in your area</p>
                <p className="text-green-600 text-sm mt-1">We will notify you if someone needs help.</p>
              </div>
            )}

            {availability && !loading && availableIncidents.map((inc) => (
              <div key={inc._id} className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse">🚨</span>
                    <span className="font-bold text-red-800">{inc.incidentId}</span>
                  </div>
                  <ProtectionLevel level={inc.protectionLevel} variant="badge" />
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-gray-400 mt-1">📍</span>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">{inc.location?.address || inc.zone?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 mt-1">Distance: <span className="font-semibold">Calculating...</span></p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-2">Evidence Signals:</p>
                    <div className="flex flex-wrap gap-2">
                      {inc.signals.filter(s => s.value).map((s, i) => (
                        <span key={i} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-700">
                          {s.type === 'SOS_BUTTON' ? '🔴 SOS Button' : s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAccept(inc.incidentId)}
                    disabled={acceptingId === inc.incidentId}
                    className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-70"
                  >
                    {acceptingId === inc.incidentId ? 'Accepting...' : 'ACCEPT & RESPOND'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Map View */}
          <div className="hidden lg:block">
             <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-24">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>🗺️</span> Area Overview
              </h2>
              <SafetyZoneMap userPosition={position} height="500px" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
