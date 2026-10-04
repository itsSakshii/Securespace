import React, { useEffect, useState } from 'react';

export default function AdaptiveSafetyStatus({ incident, onCancel }) {
  const adaptiveSafety = incident?.adaptiveSafety;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!adaptiveSafety?.cancellationDeadline) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(adaptiveSafety.cancellationDeadline).getTime();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [adaptiveSafety?.cancellationDeadline]);

  if (!adaptiveSafety) return null;

  const isExpired = timeLeft === 0;
  const isEscalated = incident.status === 'ACTIVE' || incident.status === 'GUARD_NOTIFIED' || incident.status === 'ACCEPTED' || incident.status === 'RESPONDING' || incident.status === 'ARRIVED' || incident.status === 'HANDOFF' || incident.status === 'RESOLVED';
  const displayTime = timeLeft < 10 ? `0${timeLeft}` : timeLeft;

  const getLevelColors = (level) => {
    switch (level) {
      case 'HIGH': return 'bg-red-900 border-red-500 text-red-100';
      case 'MEDIUM': return 'bg-orange-900 border-orange-500 text-orange-100';
      case 'NORMAL': return 'bg-blue-900 border-blue-500 text-blue-100';
      default: return 'bg-gray-800 border-gray-600';
    }
  };

  return (
    <div className={`p-6 rounded-xl border-2 ${getLevelColors(adaptiveSafety.level)} shadow-lg font-mono mb-6`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold uppercase mb-1">Safety Level: {adaptiveSafety.level}</h2>
          <p className="text-sm opacity-80">
            {adaptiveSafety.level === 'HIGH' && 'Multiple supporting signals agree with the SOS.'}
            {adaptiveSafety.level === 'MEDIUM' && 'Situation requires additional attention.'}
            {adaptiveSafety.level === 'NORMAL' && 'Supporting evidence is currently low.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase opacity-70">Safety Confidence</p>
          <p className="text-2xl font-bold">{adaptiveSafety.confidence} <span className="text-sm">/ 100</span></p>
        </div>
      </div>

      {!isEscalated && !isExpired && incident.status !== 'CANCELLED' && (
        <div className="bg-black/30 p-4 rounded-lg flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase opacity-70">Cancel Window</p>
            <p className="text-3xl font-bold">{displayTime}s</p>
          </div>
          <button 
            onClick={onCancel}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg uppercase tracking-wider transition-colors"
          >
            Cancel SOS
          </button>
        </div>
      )}

      {(isEscalated || (isExpired && incident.status !== 'CANCELLED')) && (
        <div className="bg-black/30 p-4 rounded-lg mb-4 text-center">
          <p className="text-red-400 font-bold uppercase animate-pulse">Emergency Escalated</p>
          <p className="text-sm opacity-80">Preparing rapid response.</p>
        </div>
      )}
      
      {incident.status === 'CANCELLED' && (
        <div className="bg-black/30 p-4 rounded-lg mb-4 text-center">
          <p className="text-green-400 font-bold uppercase">SOS Cancelled</p>
        </div>
      )}

      <div className="border-t border-white/20 pt-4 mt-4">
        <p className="text-xs uppercase opacity-70 mb-2">Supporting Evidence Log:</p>
        <div className="space-y-1 text-sm">
          {adaptiveSafety.evidence.length === 0 ? (
            <p className="opacity-50 italic">No supporting evidence yet.</p>
          ) : (
            adaptiveSafety.evidence.map((ev, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>✓ {ev.type.replace(/_/g, ' ')}</span>
                <span className="opacity-70">+{ev.contribution} pts</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
