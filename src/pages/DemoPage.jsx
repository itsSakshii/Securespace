import { useState, useEffect } from 'react';
import axios from 'axios';
import MainLayout from '../layouts/MainLayout';
import IncidentContextCard from '../components/IncidentContextCard';
import ResponseTimeline from '../components/ResponseTimeline';
import AdaptiveSafetyStatus from '../components/AdaptiveSafetyStatus';
import { useGeolocation } from '../hooks/useGeolocation';
import { io } from '../services/mockSocket';
import { getErrorMessage } from '../utils/errors';

/**
 * THE HACKATHON DEMO PAGE
 * This page simulates the entire flow using dual isolated API clients 
 * (one for user, one for guard) to demonstrate the product on a single screen.
 */
export default function DemoPage() {
  const { position } = useGeolocation();
  
  // Isolated Axios instances for demo
  const [userApi] = useState(() => axios.create({ baseURL: '/api', headers: { 'x-demo-manual': '1' } }));
  const [guardApi] = useState(() => axios.create({ baseURL: '/api' }));
  
  // State
  const [demoState, setDemoState] = useState('SETUP'); // SETUP, READY, SOS, ACTIVE, RESPONDING, RESOLVED
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [guard, setGuard] = useState(null);
  const [wearable, setWearable] = useState(null);
  const [incident, setIncident] = useState(null);
  const [events, setEvents] = useState([]);
  
  // Simulated context
  const [signals, setSignals] = useState({ movement: false, voice: false, safetyCheckFailed: false });
  const [zoneContext, setZoneContext] = useState(false);
  const [socket, setSocket] = useState(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  // 1. Setup Demo
  const setupDemo = async () => {
    setDemoState('SETUP');
    setLogs([]);
    try {
      addLog('Initializing demo environment...');
      
      // Login User
      const userRes = await userApi.post('/auth/login', { email: 'user@demo.com', password: 'password123' });
      const uToken = userRes.data.token;
      userApi.defaults.headers.common['Authorization'] = `Bearer ${uToken}`;
      setUser(userRes.data.user);
      addLog(`User authenticated: ${userRes.data.user.name}`);

      // Login Guard
      const guardRes = await guardApi.post('/auth/login', { email: 'guard1@demo.com', password: 'password123' });
      const gToken = guardRes.data.token;
      guardApi.defaults.headers.common['Authorization'] = `Bearer ${gToken}`;
      setGuard(guardRes.data.user);
      addLog(`Responder authenticated: ${guardRes.data.user.name} (${guardRes.data.user.role})`);

      // Connect Wearable
      const wRes = await userApi.post('/wearables/connect', { deviceId: 'BAND-001', isSimulator: true, battery: 86 });
      setWearable(wRes.data.wearable);
      addLog(`Wearable connected via BLE (Simulated)`);

      // Check if an active incident already exists
      try {
        const activeRes = await userApi.get('/incidents/active');
        if (activeRes.data.success && activeRes.data.incident) {
          setIncident(activeRes.data.incident);
          addLog(`Found existing active incident: ${activeRes.data.incident.incidentId}`, 'warning');
          setDemoState('ACTIVE');
          fetchEvents(activeRes.data.incident.incidentId);
        } else {
          setDemoState('READY');
        }
      } catch (err) {
        setDemoState('READY');
      }

      // Connect Socket
      if (socket) socket.disconnect();
      const newSocket = io('/', { auth: { token: uToken } });
      newSocket.on('connect', () => addLog('Real-time socket connected'));
      
      newSocket.on('incident_updated', (data) => {
        addLog(`Socket: Incident status updated to ${data.incident.status}`, 'socket');
        setIncident(data.incident);
        fetchEvents(data.incident.incidentId);
      });

      newSocket.on('incident:adaptive-update', (data) => {
        addLog(`Socket: Adaptive Engine calculated new score: ${data.adaptiveSafety.confidence}/100`, 'socket');
        setIncident(prev => prev ? { ...prev, adaptiveSafety: data.adaptiveSafety } : null);
      });

      newSocket.on('incident:escalated', (data) => {
        addLog(`Socket: Incident automatically escalated to ACTIVE`, 'warning');
        setDemoState('ACTIVE');
      });
      
      setSocket(newSocket);
      if (demoState !== 'ACTIVE') {
        setIncident(null);
        setEvents([]);
        setSignals({ movement: false, voice: false, safetyCheckFailed: false });
        setZoneContext(false);
      }
      
    } catch (err) {
      addLog(`Setup failed: ${err.message}`, 'error');
    }
  };

  const fetchEvents = async (id) => {
    try {
      const res = await userApi.get(`/incidents/${id}/events`);
      setEvents(res.data.events);
    } catch (e) {}
  };

  // 2. Simulate Context
  const toggleSignal = (type) => {
    setSignals(s => ({ ...s, [type]: !s[type] }));
    addLog(`Sensor event detected: ${type.toUpperCase()}`, 'sensor');
  };

  // 3. User Trigger SOS
  const triggerSOS = async () => {
    addLog('Wearable SOS button pressed!', 'error');
    addLog('Evaluating evidence engine...');
    
    try {
      const loc = position ? { lat: position.lat, lng: position.lng, address: 'Demo Location' } : {};
      
      // If zoneContext is true, we simulate a slight shift in GPS to the high-context zone (Sector 128)
      if (zoneContext) {
        loc.lat = 28.5355; 
        loc.lng = 77.3910;
        addLog('User entering High-Attention Zone', 'warning');
      }

      const res = await userApi.post(`/wearables/${wearable.deviceId}/sos`, { location: loc, signals });
      setIncident(res.data.incident);
      if (socket) socket.emit('join_incident', { incidentId: res.data.incident.incidentId });
      fetchEvents(res.data.incident.incidentId);
      addLog(`Incident ${res.data.incident.incidentId} created`, 'success');
      setDemoState('ACTIVE');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.incident) {
        addLog('Resuming existing active incident...', 'warning');
        setIncident(err.response.data.incident);
        if (socket) socket.emit('join_incident', { incidentId: err.response.data.incident.incidentId });
        fetchEvents(err.response.data.incident.incidentId);
        setDemoState('ACTIVE');
      } else {
        addLog(`SOS failed: ${getErrorMessage(err)}`, 'error');
        setDemoState('READY');
      }
    }
  };

  const sendEvidence = async (evidenceType) => {
    if (!incident) return;
    addLog(`Sending post-SOS evidence: ${evidenceType}`, 'sensor');
    try {
      await userApi.post(`/incidents/${incident.incidentId}/evidence`, { type: evidenceType, source: 'wearable/system' });
      addLog(`Evidence ${evidenceType} processed`, 'success');
    } catch(err) {
      addLog(`Evidence failed: ${err.message}`, 'error');
    }
  };

  // 4. Guard Actions
  const guardAction = async (actionStr, apiMethod) => {
    if (!incident) return;
    addLog(`Guard initiating: ${actionStr}...`);
    try {
      const res = await guardApi.post(`/incidents/${incident.incidentId}/${apiMethod}`);
      setIncident(res.data.incident);
      fetchEvents(res.data.incident.incidentId);
      addLog(`Guard successfully updated status to ${res.data.incident.status}`, 'success');
      if (apiMethod === 'resolve') setDemoState('RESOLVED');
    } catch (err) {
      addLog(`Guard action failed: ${getErrorMessage(err)}`, 'error');
    }
  };

  // Reset clears any running demo incident (demo backend only; harmless 404 on a real backend)
  const resetDemo = async () => {
    try { await userApi.post('/demo/reset'); } catch { /* ignore */ }
    setupDemo();
  };

  useEffect(() => {
    setupDemo();
    // eslint-disable-next-line
  }, []);

  // Close the (fake or real) socket when leaving the page
  useEffect(() => () => { socket?.disconnect(); }, [socket]);

  // Auto-scroll logs
  useEffect(() => {
    const el = document.getElementById('log-end');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type) => {
    switch(type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-orange-400';
      case 'sensor': return 'text-purple-400';
      case 'socket': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-full overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-brand">●</span> Demo Control Panel
            </h2>
            <p className="text-gray-400 text-xs mt-1">Hackathon presentation mode</p>
          </div>

          <div className="space-y-6 flex-1">
            {/* Step 1: Pre-incident Context */}
            <div className={`p-4 rounded-xl border transition-all ${demoState === 'READY' ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-transparent opacity-50'}`}>
              <h3 className="text-white text-sm font-semibold mb-3">1. Supporting Evidence (Optional)</h3>
              <div className="space-y-2">
                <button onClick={() => toggleSignal('movement')} disabled={demoState !== 'READY'}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${signals.movement ? 'bg-purple-900/50 text-purple-200 border border-purple-500' : 'bg-gray-700 text-gray-300'}`}>
                  🏃 Simulate Movement Event {signals.movement && '✓'}
                </button>
                <button onClick={() => toggleSignal('voice')} disabled={demoState !== 'READY'}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${signals.voice ? 'bg-purple-900/50 text-purple-200 border border-purple-500' : 'bg-gray-700 text-gray-300'}`}>
                  🎤 Simulate Voice Event {signals.voice && '✓'}
                </button>
                <button onClick={() => toggleSignal('safetyCheckFailed')} disabled={demoState !== 'READY'}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${signals.safetyCheckFailed ? 'bg-purple-900/50 text-purple-200 border border-purple-500' : 'bg-gray-700 text-gray-300'}`}>
                  📱 Simulate Failed Safety Check {signals.safetyCheckFailed && '✓'}
                </button>
                <button onClick={() => setZoneContext(!zoneContext)} disabled={demoState !== 'READY'}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${zoneContext ? 'bg-orange-900/50 text-orange-200 border border-orange-500' : 'bg-gray-700 text-gray-300'}`}>
                  📍 Enter High-Risk Zone {zoneContext && '✓'}
                </button>
              </div>
            </div>

            {/* Step 2: Trigger SOS */}
            <div className={`p-4 rounded-xl border transition-all ${demoState === 'READY' ? 'bg-red-900/20 border-red-900/50' : 'bg-gray-800/50 border-transparent opacity-50'}`}>
              <h3 className="text-white text-sm font-semibold mb-3">2. Primary Trigger</h3>
              <button onClick={triggerSOS} disabled={demoState !== 'READY'}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-lg transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                SIMULATE SOS PRESS
              </button>
            </div>

            {/* Step 2.5: Post-Incident Evidence */}
            <div className={`p-4 rounded-xl border transition-all ${demoState === 'ACTIVE' && incident?.status === 'INCIDENT_CREATED' ? 'bg-purple-900/20 border-purple-900/50' : 'bg-gray-800/50 border-transparent opacity-50'}`}>
              <h3 className="text-white text-sm font-semibold mb-3">2.5 Post-SOS Evidence (Adaptive)</h3>
              <div className="space-y-2">
                <button onClick={() => sendEvidence('ABNORMAL_MOVEMENT')} disabled={demoState !== 'ACTIVE'}
                  className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-purple-900 text-gray-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                  🏃 New Movement Detected
                </button>
                <button onClick={() => sendEvidence('DISTRESS_VOICE')} disabled={demoState !== 'ACTIVE'}
                  className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-purple-900 text-gray-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                  🎤 New Distress Voice
                </button>
              </div>
            </div>

            {/* Step 3: Responder Actions */}
            <div className={`p-4 rounded-xl border transition-all ${demoState === 'ACTIVE' ? 'bg-brand-900/20 border-brand-900/50' : 'bg-gray-800/50 border-transparent opacity-50'}`}>
              <h3 className="text-white text-sm font-semibold mb-3">3. Responder Flow</h3>
              <div className="space-y-2">
                <button onClick={() => guardAction('Accept', 'accept')} disabled={!incident || incident.status !== 'GUARD_NOTIFIED'}
                  className="w-full py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Guard: Accept Incident
                </button>
                <button onClick={() => guardAction('Respond', 'responding')} disabled={!incident || incident.status !== 'ACCEPTED'}
                  className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Guard: Mark Responding
                </button>
                <button onClick={() => guardAction('Arrive', 'arrived')} disabled={!incident || incident.status !== 'RESPONDING'}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Guard: Mark Arrived
                </button>
                <button onClick={() => guardAction('Resolve', 'resolve')} disabled={!incident || !['ARRIVED', 'HANDOFF'].includes(incident.status)}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  Guard: Resolve Incident
                </button>
              </div>
            </div>
          </div>

          <button onClick={resetDemo} className="w-full py-3 mt-6 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition">
            ↻ Reset Demo
          </button>
        </div>

        {/* Right Panel: Live State */}
        <div className="w-full lg:w-2/3 bg-gray-50 p-6 overflow-y-auto">
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">User View</h3>
              {incident ? (
                <div className="space-y-4">
                  <AdaptiveSafetyStatus 
                    incident={incident} 
                    onCancel={() => userApi.post(`/incidents/${incident.incidentId}/cancel`).then(() => {
                      addLog('User cancelled SOS', 'success');
                      setDemoState('RESOLVED');
                      setIncident(prev => ({...prev, status: 'CANCELLED'}));
                    })} 
                  />
                  <IncidentContextCard incident={incident} />
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400">
                  <span className="text-4xl block mb-2">📱</span>
                  No active incident
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">System & Responder</h3>
              {incident ? (
                <ResponseTimeline currentStatus={incident.status} events={events} />
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400">
                  <span className="text-4xl block mb-2">🛡️</span>
                  Waiting for alerts...
                </div>
              )}
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 font-mono text-xs overflow-hidden flex flex-col h-64">
            <div className="text-gray-500 mb-2 border-b border-gray-800 pb-2">SYSTEM CONSOLE LOGS</div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-gray-600 shrink-0">[{log.time}]</span>
                  <span className={getLogColor(log.type)}>{log.msg}</span>
                </div>
              ))}
              <div id="log-end" />
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}