import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWearable } from '../context/WearableContext';
import { useIncident } from '../context/IncidentContext';
import { useSocket } from '../context/SocketContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useProtectionLevel } from '../hooks/useProtectionLevel';
import { zoneApi } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import MainLayout from '../layouts/MainLayout';
import WearableSimulator from '../components/WearableSimulator';
import IncidentContextCard from '../components/IncidentContextCard';
import CancellationTimer from '../components/CancellationTimer';
import SafetyZoneMap from '../components/SafetyZoneMap';
import ProtectionLevel from '../components/ProtectionLevel';

export default function DashboardPage() {
  const { user } = useAuth();
  const { wearable, isConnected } = useWearable();
  const { activeIncident, loadActiveIncident, cancelIncident, setActiveIncident } = useIncident();
  const { on, off, joinRoom } = useSocket();
  const { position } = useGeolocation();
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [currentZone, setCurrentZone] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const level = activeIncident?.protectionLevel || 'NORMAL';
  const pl = useProtectionLevel(level);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    loadActiveIncident();
  }, []);

  useEffect(() => {
    if (position) {
      fetchZones();
    }
  }, [position]);

  useEffect(() => {
    if (activeIncident) {
      joinRoom(activeIncident.incidentId);
    }
  }, [activeIncident]);

  // Real-time incident updates
  useEffect(() => {
    const handleUpdate = ({ incident }) => {
      if (incident && activeIncident && incident.incidentId === activeIncident?.incidentId) {
        setActiveIncident(incident);
      }
    };
    on('incident_updated', handleUpdate);
    const handleCreated = ({ incident }) => { if (incident) setActiveIncident(incident); };
    on('incident_created', handleCreated);
    return () => {
      off('incident_updated', handleUpdate);
      off('incident_created', handleCreated);
    };
  }, [activeIncident]);

  const fetchZones = async () => {
    try {
      const res = await zoneApi.getNearby({ lat: position.lat, lng: position.lng, radius: 5000 });
      setZones(res.data.zones || []);
      const ctxRes = await zoneApi.getContext({ lat: position.lat, lng: position.lng });
      setCurrentZone(ctxRes.data.zone);
    } catch {}
  };

  const handleSOSResult = (incident) => {
    if (incident) {
      setActiveIncident(incident);
      navigate(`/incident/${incident.incidentId}`);
    }
  };

  const handleCancel = async () => {
    if (!activeIncident) return;
    setCancelLoading(true);
    try {
      await cancelIncident(activeIncident.incidentId);
    } catch (err) {
      alert(getErrorMessage(err, 'Cannot cancel'));
    }
    setCancelLoading(false);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Top status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-gray-500 text-sm mb-1">{greeting}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{user?.name}</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Protection</p>
              <ProtectionLevel level={level} variant="badge" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Wearable</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Battery</p>
              <span className="text-sm font-semibold text-gray-800">{wearable.battery}%</span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Zone</p>
              <span className="text-sm font-semibold text-gray-800">{currentZone?.name || 'Detecting...'}</span>
            </div>
          </div>
        </div>

        {/* Active incident alert */}
        {activeIncident && !['RESOLVED', 'CANCELLED'].includes(activeIncident.status) && (
          <div className="space-y-4">
            <IncidentContextCard
              incident={activeIncident}
              showCancelButton={false}
            />
            {['INCIDENT_CREATED', 'GUARD_NOTIFIED'].includes(activeIncident.status) && (
              <CancellationTimer
                incident={activeIncident}
                onCancel={handleCancel}
                onExpired={() => loadActiveIncident()}
              />
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Wearable + Zone */}
          <div className="lg:col-span-2 space-y-4">
            {/* Wearable simulator */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📟</span> Wearable
              </h2>
              <WearableSimulator onSOS={handleSOSResult} compact />
            </div>

            {/* Zone card */}
            {currentZone && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm">Current Zone</h3>
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">DEMO DATA</span>
                </div>
                <p className="font-medium text-gray-900">{currentZone.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${currentZone.contextScore > 60 ? 'bg-orange-500' : currentZone.contextScore > 40 ? 'bg-yellow-400' : 'bg-green-500'}`}
                      style={{ width: `${currentZone.contextScore}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{currentZone.contextScore}/100</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Context score (not a crime risk rating)</p>
              </div>
            )}

            {/* GPS status */}
            {position?.isDefault && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠ GPS unavailable · Using default location
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>🗺️</span> Safety Map
              </h2>
              <SafetyZoneMap zones={zones} userPosition={position} height="350px" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
