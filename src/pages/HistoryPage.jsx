import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../services/api';
import MainLayout from '../layouts/MainLayout';
import ProtectionLevel from '../components/ProtectionLevel';

export default function HistoryPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incidentApi.getUserIncidents()
      .then(res => setIncidents(res.data.incidents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s) => {
    const m = { RESOLVED: 'text-green-700 bg-green-50', CANCELLED: 'text-gray-600 bg-gray-100', CRITICAL: 'text-red-700 bg-red-50' };
    return m[s] || 'text-blue-700 bg-blue-50';
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Incident History</h1>
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading history...</div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-4xl block mb-2">📋</span>
            <p>No incidents recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <Link key={incident._id} to={`/incident/${incident.incidentId}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-brand transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-700">{incident.incidentId}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{incident.location?.address || incident.zone?.name || 'Location unavailable'}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(incident.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ProtectionLevel level={incident.protectionLevel} variant="badge" />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(incident.status)}`}>
                      {incident.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
