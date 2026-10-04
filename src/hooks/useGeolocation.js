import { useState, useEffect, useCallback } from 'react';

// Default to IIIT Delhi area for demo (module-level so its identity is stable across renders)
const DEFAULT = { lat: 28.5450, lng: 77.2690, accuracy: 100, isDefault: true };

export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setPosition(DEFAULT);
      setError('Geolocation not supported. Using default location.');
      return Promise.resolve(DEFAULT);
    }
    setLoading(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, isDefault: false };
          setPosition(p);
          setError(null);
          setLoading(false);
          resolve(p);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          setPosition(DEFAULT);
          setError('GPS unavailable. Using last known/default location.');
          setLoading(false);
          resolve(DEFAULT);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }, []);

  useEffect(() => {
    getCurrentPosition();
  }, []);

  return { position: position || DEFAULT, error, loading, getCurrentPosition };
}
