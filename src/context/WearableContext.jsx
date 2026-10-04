import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const WearableContext = createContext(null);

const DEFAULT_WEARABLE = {
  deviceId: 'BAND-001',
  battery: 86,
  connected: false,
  status: 'DISCONNECTED',
  lastEvent: null,
  isSimulator: true,
  firmwareVersion: '1.0.0',
};

export function WearableProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [wearable, setWearable] = useState(DEFAULT_WEARABLE);
  const [loading, setLoading] = useState(false);
  const [bleAvailable] = useState(() => 'bluetooth' in navigator);

  const connectWearable = useCallback(async (deviceId = 'BAND-001', battery = 86) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/wearables/connect', { deviceId, isSimulator: true, battery });
      setWearable({
        deviceId: res.data.wearable.deviceId,
        battery: res.data.wearable.battery,
        connected: true,
        status: 'SIMULATED',
        lastEvent: res.data.wearable.lastEvent,
        isSimulator: true,
        firmwareVersion: res.data.wearable.firmwareVersion || '1.0.0',
      });
      return res.data.wearable;
    } catch (err) {
      console.error('Connect wearable error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWearable = useCallback(() => {
    setWearable(prev => ({ ...prev, connected: false, status: 'DISCONNECTED' }));
  }, []);

  const sendSOS = useCallback(async (location, signals = {}) => {
    if (!wearable.deviceId) throw new Error('Wearable not connected');
    const res = await axios.post(`/api/wearables/${wearable.deviceId}/sos`, { location, signals });
    setWearable(prev => ({ ...prev, lastEvent: 'SOS_TRIGGERED' }));
    return res.data.incident;
  }, [wearable.deviceId]);

  const sendEvent = useCallback(async (eventType, data = {}) => {
    if (!wearable.deviceId) return;
    try {
      await axios.post(`/api/wearables/${wearable.deviceId}/event`, { eventType, data });
      setWearable(prev => ({ ...prev, lastEvent: eventType }));
    } catch (err) {
      console.error('sendEvent error:', err);
    }
  }, [wearable.deviceId]);

  const updateBattery = useCallback((newBattery) => {
    setWearable(prev => ({ ...prev, battery: newBattery }));
  }, []);

  return (
    <WearableContext.Provider value={{
      wearable, loading, bleAvailable,
      connectWearable, disconnectWearable, sendSOS, sendEvent, updateBattery,
      isConnected: wearable.connected,
    }}>
      {children}
    </WearableContext.Provider>
  );
}

export const useWearable = () => {
  const ctx = useContext(WearableContext);
  if (!ctx) throw new Error('useWearable must be used within WearableProvider');
  return ctx;
};
