import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIncident } from '../context/IncidentContext';
import { useSocket } from '../context/SocketContext';
import { incidentApi } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import MainLayout from '../layouts/MainLayout';
import IncidentContextCard from '../components/IncidentContextCard';
import ResponseTimeline from '../components/ResponseTimeline';
import CancellationTimer from '../components/CancellationTimer';
import SafetyZoneMap from '../components/SafetyZoneMap';

export default function IncidentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { activeIncident, setActiveIncident, cancelIncident } = useIncident();
  const { on, off, joinRoom } = useSocket();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncident();
  }, [id]);

  useEffect(() => {
    if (incident) joinRoom(incident.incidentId);
  }, [incident?.incidentId]);

  useEffect(() => {
    const handler = ({ incident: updated }) => {
      if (updated && updated.incidentId === id) {
        setIncident(updated);
        setActiveIncident(updated);
      }
    };
    const reload = () => loadIncident();
    const reloadEvents = ['responder_accepted', 'responder_responding', 'responder_arrived', 'incident_resolved'];
    on('incident_updated', handler);
    reloadEvents.forEach((ev) => on(ev, reload));
    return () => {
      off('incident_updated', handler);
      reloadEvents.forEach((ev) => off(ev, reload));
    };
  }, [id]);

  const loadIncident = async () => {
    try {
      const [incRes, evRes] = await Promise.all([
        incidentApi.getIncident(id),
        incidentApi.getEvents(id).catch(() => ({ data: { events: [] } })),
      ]);
      setIncident(incRes.data.incident);
      setEvents(evRes.data.events || []);
    } catch {
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelIncident(id);
      navigate('/dashboard');
    } catch (err) {
      alert(getErrorMessage(err, 'Cannot cancel'));
    }
  };

  if (loading) return <MainLayout><div className="flex justify-center py-20 text-gray-400">Loading incident...</div></MainLayout>;
  if (!incident) return <MainLayout><div className="text-center py-20 text-gray-400">Incident not found</div></MainLayout>;

  const incLat = incident.location?.coordinates?.[1];
  const incLng = incident.location?.coordinates?.[0];
  const incidentPos = incLat && incLng ? { lat: incLat, lng: incLng } : null;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Live Incident</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <IncidentContextCard incident={incident} showCancelButton={true} onCancel={handleCancel} />
            {['INCIDENT_CREATED', 'GUARD_NOTIFIED'].includes(incident.status) && (
              <CancellationTimer incident={incident} onCancel={handleCancel} onExpired={loadIncident} />
            )}
          </div>
          <div className="space-y-4">
            <ResponseTimeline currentStatus={incident.status} events={events} />
            {incidentPos && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">Incident Location</h3>
                <SafetyZoneMap userPosition={incidentPos} height="220px" />
              </div>
            )}
          </div>
        </div>

        {['RESOLVED', 'CANCELLED'].includes(incident.status) && (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-gray-600 font-medium">
              {incident.status === 'RESOLVED' ? '✅ Incident resolved' : '✕ Incident cancelled'}
            </p>
            <button onClick={() => navigate('/dashboard')} className="mt-2 text-brand text-sm hover:underline">
              Return to dashboard
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
