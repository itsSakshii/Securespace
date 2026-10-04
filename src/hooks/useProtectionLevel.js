export function useProtectionLevel(level = 'NORMAL') {
  const levels = {
    NORMAL: {
      color: '#22c55e',
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      ring: 'ring-green-400',
      badge: 'bg-green-100 text-green-800',
      dot: 'bg-green-500',
      label: 'NORMAL',
      description: 'No active concern. Minimal monitoring active.',
    },
    WATCH: {
      color: '#f59e0b',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      ring: 'ring-amber-400',
      badge: 'bg-amber-100 text-amber-800',
      dot: 'bg-amber-500',
      label: 'WATCH',
      description: 'Some contextual factors suggest increased attention.',
    },
    CAREFUL: {
      color: '#f97316',
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      ring: 'ring-orange-400',
      badge: 'bg-orange-100 text-orange-800',
      dot: 'bg-orange-500',
      label: 'CAREFUL',
      description: 'Multiple signals indicate increased concern.',
    },
    CRITICAL: {
      color: '#ef4444',
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      ring: 'ring-red-500',
      badge: 'bg-red-100 text-red-800',
      dot: 'bg-red-500',
      label: 'CRITICAL',
      description: 'Strong evidence. Rapid emergency workflow active.',
    },
  };
  return levels[level] || levels.NORMAL;
}
