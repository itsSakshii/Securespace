import { useProtectionLevel } from '../hooks/useProtectionLevel';

export default function ProtectionLevel({ level = 'NORMAL', variant = 'badge' }) {
  const pl = useProtectionLevel(level);

  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${pl.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${pl.dot} ${level === 'CRITICAL' ? 'animate-pulse' : ''}`} />
        {level}
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border-2 ${pl.border} ${pl.bg} p-4`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full ${pl.dot} ${level === 'CRITICAL' ? 'animate-ping' : ''}`} />
          <span className={`font-black text-lg ${pl.text}`}>{level}</span>
        </div>
        <p className={`text-sm ${pl.text} opacity-80`}>{pl.description}</p>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <div className={`text-center py-6 rounded-2xl ${pl.bg} border-2 ${pl.border}`}>
        <div className={`inline-flex w-16 h-16 rounded-full ${pl.dot} items-center justify-center mb-3 ${level === 'CRITICAL' ? 'animate-pulse' : ''}`}>
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <p className={`font-black text-2xl ${pl.text}`}>{level}</p>
        <p className={`text-sm mt-1 ${pl.text} opacity-70`}>{pl.description}</p>
      </div>
    );
  }

  return <span className={`font-bold ${pl.text}`}>{level}</span>;
}
