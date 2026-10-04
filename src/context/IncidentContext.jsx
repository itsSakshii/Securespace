import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const IncidentContext = createContext(null);

export function IncidentProvider({ children }) {
  const [activeIncident, setActiveIncident] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadIncident = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/incidents/${id}`);
      setActiveIncident(res.data.incident);
      return res.data.incident;
    } catch (err) {
      console.error('loadIncident error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveIncident = useCallback(async () => {
    try {
      const res = await axios.get('/api/incidents/active');
      setActiveIncident(res.data.incident || null);
      return res.data.incident;
    } catch {
      return null;
    }
  }, []);

  const cancelIncident = useCallback(async (incidentId) => {
    const res = await axios.post(`/api/incidents/${incidentId}/cancel`);
    setActiveIncident(null);
    return res.data;
  }, []);

  const clearIncident = useCallback(() => { setActiveIncident(null); }, []);

  return (
    <IncidentContext.Provider value={{
      activeIncident, setActiveIncident, loading,
      loadIncident, loadActiveIncident, cancelIncident, clearIncident,
    }}>
      {children}
    </IncidentContext.Provider>
  );
}

export const useIncident = () => {
  const ctx = useContext(IncidentContext);
  if (!ctx) throw new Error('useIncident must be used within IncidentProvider');
  return ctx;
};
