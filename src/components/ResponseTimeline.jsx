import { useEffect, useState } from 'react';

const STATES = ['INCIDENT_CREATED', 'GUARD_NOTIFIED', 'ACCEPTED', 'RESPONDING', 'ARRIVED', 'HANDOFF', 'RESOLVED'];

const STATE_LABELS = {
  INCIDENT_CREATED: 'Incident Created',
  GUARD_NOTIFIED: 'Guard Notified',
  ACCEPTED: 'Guard Accepted',
  RESPONDING: 'Guard Responding',
  ARRIVED: 'Guard Arrived',
  HANDOFF: 'Handoff Complete',
  RESOLVED: 'Resolved',
  CANCELLED: 'Cancelled',
};

const STATE_ICONS = {
  INCIDENT_CREATED: '🚨',
  GUARD_NOTIFIED: '📢',
  ACCEPTED: '✅',
  RESPONDING: '🏃',
  ARRIVED: '📍',
  HANDOFF: '🤝',
  RESOLVED: '✓',
  CANCELLED: '✕',
};

export default function ResponseTimeline({ currentStatus, events = [] }) {
  const currentIndex = STATES.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Response Timeline</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {(isCancelled ? [...STATES.slice(0, Math.max(currentIndex + 1, 1)), 'CANCELLED'] : STATES).map((state, i) => {
            const done = isCancelled ? state === 'CANCELLED' ? true : i < currentIndex : i <= currentIndex;
            const active = isCancelled ? false : i === currentIndex;
            const event = events.find(e => e.eventType === state);
            return (
              <div key={state} className="flex items-start gap-4 relative">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  done
                    ? isCancelled && state === 'CANCELLED'
                      ? 'border-red-500 bg-red-100 text-red-600'
                      : 'border-brand bg-brand text-white'
                    : active
                    ? 'border-brand bg-white text-brand animate-pulse'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}>
                  {STATE_ICONS[state]}
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>
                    {STATE_LABELS[state]}
                  </p>
                  {event && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
