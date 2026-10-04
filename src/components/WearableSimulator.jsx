import { useState } from 'react';
import { useWearable } from '../context/WearableContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { getErrorMessage } from '../utils/errors';

export default function WearableSimulator({ onSOS, onEvent, compact = false }) {
  const { wearable, connectWearable, disconnectWearable, sendSOS, sendEvent, isConnected } = useWearable();
  const { position } = useGeolocation();
  const [sosState, setSosState] = useState('idle'); // idle | holding | sending | sent
  const [vibrating, setVibrating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [bleFlow, setBleFlow] = useState([]);

  const addFlow = (step) => {
    setBleFlow(prev => [...prev.slice(-4), { step, time: new Date().toLocaleTimeString() }]);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      addFlow('Scanning for BAND-001...');
      await new Promise(r => setTimeout(r, 800));
      addFlow('BLE handshake...');
      await connectWearable('BAND-001', 86);
      addFlow('Connected ✓');
    } catch {
      addFlow('Connection failed');
    }
    setConnecting(false);
  };

  const handleSOSHold = async () => {
    if (sosState !== 'idle') return;
    setSosState('holding');
    // Simulate hold-to-confirm
    await new Promise(r => setTimeout(r, 800));
    setSosState('sending');

    // Vibrate device
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setVibrating(true);

    addFlow('SOS button pressed!');
    addFlow('BLE signal → Phone');
    addFlow('Sending to backend...');

    try {
      const incident = await sendSOS(
        { lat: position?.lat || 28.5450, lng: position?.lng || 77.2690, address: 'Current Location' },
        {}
      );
      addFlow('Incident created ✓');
      setSosState('sent');
      setVibrating(false);
      if (onSOS) onSOS(incident);
      setTimeout(() => setSosState('idle'), 5000);
    } catch (err) {
      const existing = err.response?.status === 409 ? err.response?.data?.incident : null;
      if (existing) {
        // an SOS is already running: just take the user back to it
        addFlow('Active incident found — resuming');
        setSosState('idle');
        setVibrating(false);
        if (onSOS) onSOS(existing);
        return;
      }
      addFlow(`Error: ${getErrorMessage(err, 'Error')}`);
      setSosState('idle');
      setVibrating(false);
    }
  };

  const handleSimEvent = async (type) => {
    await sendEvent(type, { intensity: 0.75, timestamp: Date.now() });
    addFlow(`${type} event sent`);
    if (onEvent) onEvent(type);
  };

  const batteryColor = wearable.battery > 60 ? 'bg-green-500' : wearable.battery > 30 ? 'bg-yellow-400' : 'bg-red-500';
  const batteryWidth = `${wearable.battery}%`;

  const sosButtonClass = {
    idle: 'bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer',
    holding: 'bg-red-700 text-white shadow-xl scale-95',
    sending: 'bg-red-800 text-white animate-pulse',
    sent: 'bg-green-600 text-white cursor-not-allowed',
  }[sosState];

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-2xl p-4 text-white max-w-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold tracking-widest text-gray-400">SAFETY BAND</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
        </div>
        <div className="flex items-center gap-3">
          <button onMouseDown={handleSOSHold} disabled={sosState !== 'idle' || !isConnected}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${sosButtonClass} ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {sosState === 'sent' ? '✓ SOS SENT' : sosState === 'sending' ? 'SENDING...' : 'SOS'}
          </button>
          <div className="text-right text-xs text-gray-400">
            <div>{wearable.battery}%</div>
            <div className={`text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>{isConnected ? 'SIM' : 'OFF'}</div>
          </div>
        </div>
        {!isConnected && (
          <button onClick={handleConnect} disabled={connecting}
            className="mt-2 w-full py-1.5 text-xs bg-brand rounded-lg text-white hover:bg-brand-dark">
            {connecting ? 'Connecting...' : 'Connect Wearable'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Bracelet UI */}
      <div className="bg-gray-900 rounded-3xl p-6 text-white w-full max-w-sm mx-auto lg:mx-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-xs font-bold tracking-[0.2em] text-gray-300">SAFETY BAND</span>
          </div>
          <span className="text-xs text-gray-500">{wearable.firmwareVersion}</span>
        </div>

        {/* BLE Status */}
        <div className={`flex items-center gap-2 mb-5 mt-2 text-xs ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          {isConnected ? 'BLE SIMULATED · CONNECTED' : 'BLE DISCONNECTED'}
          {vibrating && <span className="ml-2 text-yellow-400 animate-pulse">📳 VIBRATING</span>}
        </div>

        {/* SOS Button */}
        <div className="flex justify-center my-6">
          <div className="relative">
            {(sosState === 'idle' && isConnected) && (
              <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-30" />
            )}
            <button
              onMouseDown={handleSOSHold}
              disabled={!isConnected || sosState !== 'idle'}
              className={`w-32 h-32 rounded-full text-xl font-black tracking-wider transition-all duration-200 select-none ${sosButtonClass} ${!isConnected ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {sosState === 'sent' ? '✓ SENT' : sosState === 'sending' ? '...' : 'SOS'}
            </button>
          </div>
        </div>

        {!isConnected && (
          <p className="text-center text-xs text-gray-500 mb-4">Connect wearable to enable SOS</p>
        )}

        {/* Device info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Battery</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${batteryColor} transition-all`} style={{ width: batteryWidth }} />
              </div>
              <span className="text-xs text-gray-300">{wearable.battery}%</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Device</span>
            <span className="text-gray-200 font-mono text-xs">{wearable.deviceId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={`text-xs font-semibold ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
              {isConnected ? 'SIMULATED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Event</span>
            <span className="text-gray-300 text-xs">{wearable.lastEvent || '—'}</span>
          </div>
        </div>

        {/* Connect / Disconnect */}
        <div className="mt-4">
          {!isConnected ? (
            <button onClick={handleConnect} disabled={connecting}
              className="w-full py-2.5 bg-brand rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50">
              {connecting ? 'Connecting via BLE...' : '📡 Connect Wearable'}
            </button>
          ) : (
            <button onClick={disconnectWearable}
              className="w-full py-2 bg-gray-700 rounded-xl text-sm text-gray-300 hover:bg-gray-600 transition-colors">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 space-y-4">
        {/* Simulate events */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📡</span> Simulate Sensor Events
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            These events are supporting evidence only. They do NOT independently create an emergency.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleSimEvent('MOVEMENT')} disabled={!isConnected}
              className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-40 transition-colors">
              🏃 Movement Event
            </button>
            <button onClick={() => handleSimEvent('VOICE')} disabled={!isConnected}
              className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-40 transition-colors">
              🎤 Voice Event
            </button>
          </div>
        </div>

        {/* BLE Flow Log */}
        <div className="bg-gray-900 rounded-2xl p-4 text-xs font-mono text-green-400">
          <div className="text-gray-500 mb-2">BLE EVENT LOG</div>
          {bleFlow.length === 0 ? (
            <div className="text-gray-600">Waiting for events...</div>
          ) : (
            bleFlow.map((e, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600">[{e.time}]</span>
                <span>{e.step}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
