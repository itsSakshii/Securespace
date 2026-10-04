import { useEffect, useState } from 'react';

export default function CancellationTimer({ incident, onCancel, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!incident?.cancellationDeadline) return;
    const deadline = new Date(incident.cancellationDeadline).getTime();

    let interval = null;
    const tick = () => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (remaining <= 0) {
        setTimeLeft(0);
        setExpired(true);
        if (interval) clearInterval(interval); // stop polling: notify only once
        if (onExpired) onExpired();
      } else {
        setTimeLeft(remaining);
      }
    };

    tick();
    interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [incident?.cancellationDeadline]);

  if (!incident?.cancellationDeadline || expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-700 font-semibold text-sm">Cancellation window closed</p>
        <p className="text-red-500 text-xs mt-1">Incident has been escalated to responders</p>
      </div>
    );
  }

  const total = incident.cancellationWindow || 10;
  const progress = timeLeft !== null ? (timeLeft / total) * 100 : 100;
  const urgent = timeLeft !== null && timeLeft <= 3;

  return (
    <div className={`rounded-xl border-2 p-4 ${urgent ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`font-semibold text-sm ${urgent ? 'text-red-700' : 'text-amber-700'}`}>
          ⏱ Cancellation Window
        </p>
        <span className={`text-2xl font-black tabular-nums ${urgent ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
          {timeLeft}s
        </span>
      </div>

      {/* Progress ring */}
      <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgent ? 'bg-red-500' : 'bg-amber-400'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Your SOS has been received. Press cancel only if this was accidental.
      </p>

      <button
        onClick={onCancel}
        className="w-full py-2 border-2 border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-white transition-colors font-medium"
      >
        Cancel SOS (Accidental Trigger)
      </button>
    </div>
  );
}
