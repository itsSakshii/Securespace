import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { incidentApi } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import MainLayout from '../layouts/MainLayout';
import IncidentContextCard from '../components/IncidentContextCard';
import ResponseTimeline from '../components/ResponseTimeline';
import SafetyZoneMap from '../components/SafetyZoneMap';
import { useGeolocation } from '../hooks/useGeolocation';

export default function GuardIncidentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { on, off, joinRoom } = useSocket();
  const { position } = useGeolocation();
  
  const [incident, setIncident] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        loadEvents();
      }
    };
    on('incident_updated', handler);
    return () => { off('incident_updated', handler); };
  }, [id]);

  const loadEvents = async () => {
    try {
      const res = await incidentApi.getEvents(id);
      setEvents(res.data.events || []);
    } catch (err) {}
  };

  const loadIncident = async () => {
    setLoading(true);
    try {
      const incRes = await incidentApi.getIncident(id);
      setIncident(incRes.data.incident);
      await loadEvents();
    } catch {
      navigate('/guard/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      let res;
      switch (action) {
        case 'RESPONDING': res = await incidentApi.markResponding(id); break;
        case 'ARRIVED': res = await incidentApi.markArrived(id); break;
        case 'HANDOFF': res = await incidentApi.markHandoff(id); break;
        case 'RESOLVE': 
          res = await incidentApi.resolve(id); 
          navigate('/guard/dashboard');
          return;
      }
      setIncident(res.data.incident);
      await loadEvents();
    } catch (err) {
      alert(getErrorMessage(err, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <MainLayout><div className="flex justify-center py-20 text-gray-400">Loading incident data...</div></MainLayout>;
  if (!incident) return <MainLayout><div className="text-center py-20 text-gray-400">Incident not found</div></MainLayout>;

  const incLat = incident.location?.coordinates?.[1];
  const incLng = incident.location?.coordinates?.[0];
  const incidentPos = incLat && incLng ? { lat: incLat, lng: incLng } : null;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/guard/dashboard')} className="text-gray-400 hover:text-gray-600">
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-900">Active Response</h1>
          </div>
          <span className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-lg text-sm border border-red-200">
            {incident.incidentId}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Context Column */}
          <div className="lg:col-span-2 space-y-6">
            <IncidentContextCard incident={incident} showCancelButton={false} />
            
            {/* Guard Action Panel */}
            <div className="bg-white rounded-2xl border-2 border-brand p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">Update Response Status</h3>
              <p className="text-sm text-gray-500 mb-4">Please update your status as you progress with the response.</p>
              
              <div className="space-y-3">
                {incident.status === 'ACCEPTED' && (
                  <button onClick={() => handleAction('RESPONDING')} disabled={actionLoading}
                    className="w-full py-4 bg-brand text-white rounded-xl font-bold hover:bg-brand-dark transition text-lg">
                    {actionLoading ? 'Updating...' : 'I Am Responding (En Route)'}
                  </button>
                )}
                {incident.status === 'RESPONDING' && (
                  <button onClick={() => handleAction('ARRIVED')} disabled={actionLoading}
                    className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition text-lg">
                    {actionLoading ? 'Updating...' : 'I Have Arrived On Scene'}
                  </button>
                )}
                {incident.status === 'ARRIVED' && (
                  <button onClick={() => handleAction('HANDOFF')} disabled={actionLoading}
                    className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition text-lg">
                    {actionLoading ? 'Updating...' : 'Authorities/Help Arrived (Handoff)'}
                  </button>
                )}
                {['ARRIVED', 'HANDOFF'].includes(incident.status) && (
                  <button onClick={() => handleAction('RESOLVE')} disabled={actionLoading}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition text-lg">
                    {actionLoading ? 'Updating...' : 'Mark Incident as Resolved'}
                  </button>
                )}
                
                {['RESOLVED', 'CANCELLED'].includes(incident.status) && (
                  <div className="text-center py-4 text-green-700 font-semibold bg-green-50 rounded-xl">
                    This incident is closed.
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            {incidentPos && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Navigation Map</h3>
                <SafetyZoneMap userPosition={position} incidentLocation={incidentPos} height="350px" />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ResponseTimeline currentStatus={incident.status} events={events} />
            
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h3 className="font-semibold text-amber-800 mb-2 text-sm flex items-center gap-2">
                <span>⚠</span> Responder Safety
              </h3>
              <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4">
                <li>Assess the situation carefully upon arrival.</li>
                <li>Do not escalate dangerous situations.</li>
                <li>Wait for official authorities if weapons or severe violence are present.</li>
                <li>Your priority is securing the user's safety and providing witness presence.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
