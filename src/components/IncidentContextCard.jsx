import { useProtectionLevel } from '../hooks/useProtectionLevel';

export default function IncidentContextCard({ incident, compact = false, showCancelButton = false, onCancel }) {
  const pl = useProtectionLevel(incident?.protectionLevel || 'CRITICAL');
  if (!incident) return null;

  const sosMins = incident.createdAt
    ? Math.floor((Date.now() - new Date(incident.createdAt)) / 60000)
    : 0;

  const statusLabel = {
    INCIDENT_CREATED: 'Incident Created',
    GUARD_NOTIFIED: 'Guard Notified',
    ACCEPTED: 'Guard Accepted',
    RESPONDING: 'Responding',
    ARRIVED: 'Guard Arrived',
    HANDOFF: 'Handoff Complete',
    RESOLVED: 'Resolved',
    CANCELLED: 'Cancelled',
  }[incident.status] || incident.status;

  const signals = incident.signals || [];
  const activeSignals = signals.filter(s => s.value);

  return (
    <div className={`rounded-2xl border-2 ${pl.border} bg-white overflow-hidden`}>
      {/* Header bar */}
      <div className={`${pl.bg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <div>
            <p className={`font-bold text-sm ${pl.text}`}>ACTIVE INCIDENT</p>
            <p className="text-xs text-gray-500 font-mono">{incident.incidentId}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs font-black ${pl.badge} ${incident.protectionLevel === 'CRITICAL' ? 'animate-pulse' : ''}`}>
          {incident.protectionLevel}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Location */}
        <div className="flex items-start gap-2">
          <span className="text-gray-400 text-sm mt-0.5">📍</span>
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="text-sm font-medium text-gray-800">{incident.location?.address || incident.zone?.name || 'Location unavailable'}</p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">🕐</span>
          <div>
            <p className="text-xs text-gray-500">Time</p>
            <p className="text-sm text-gray-800">{sosMins > 0 ? `${sosMins} min ago` : 'Just now'}</p>
          </div>
        </div>

        {/* Signals */}
        {!compact && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Evidence Signals</p>
            <div className="space-y-1">
              {signals.map((sig, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${sig.value ? 'text-gray-800' : 'text-gray-400'}`}>
                  <span>{sig.value ? '✓' : '○'}</span>
                  <span className={sig.type === 'SOS_BUTTON' ? 'font-bold' : ''}>{sig.label || sig.type}</span>
                  {sig.type === 'SOS_BUTTON' && <span className="text-red-500 font-bold text-xs">PRIMARY</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence */}
        {!compact && incident.confidence !== undefined && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Evidence Confidence</span>
              <span className="font-semibold">{incident.confidence}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pl.dot}`}
                style={{ width: `${incident.confidence}%` }}
              />
            </div>
          </div>
        )}

        {/* Zone */}
        {incident.zone?.name && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>🗺️</span>
            <span>Zone: {incident.zone.name}</span>
            {incident.zone.contextScore > 0 && <span className="text-gray-400">(Context: {incident.zone.contextScore})</span>}
          </div>
        )}

        {/* Responder */}
        {incident.assignedResponder && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Assigned Responder</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white text-xs font-bold">
                {incident.assignedResponder?.name?.charAt(0) || 'R'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{incident.assignedResponder?.name || 'Guard'}</p>
                <p className="text-xs text-gray-500">{(incident.assignedResponderType || '').replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className={`flex items-center gap-2 text-sm font-semibold ${pl.text}`}>
          <span className={`w-2 h-2 rounded-full ${pl.dot} ${incident.status === 'RESPONDING' || incident.status === 'GUARD_NOTIFIED' ? 'animate-pulse' : ''}`} />
          {statusLabel}
        </div>

        {/* Cancel */}
        {showCancelButton && ['INCIDENT_CREATED', 'GUARD_NOTIFIED'].includes(incident.status) && (
          <button onClick={onCancel}
            className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel SOS (within window)
          </button>
        )}
      </div>
    </div>
  );
}
