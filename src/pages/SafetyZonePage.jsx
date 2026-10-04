import { useEffect, useState } from 'react';
import { zoneApi } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import MainLayout from '../layouts/MainLayout';
import SafetyZoneMap from '../components/SafetyZoneMap';

export default function SafetyZonePage() {
  const { position } = useGeolocation();
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (position) fetchZones();
  }, [position]);

  const fetchZones = async () => {
    try {
      const res = await zoneApi.getNearby({ lat: position.lat, lng: position.lng, radius: 20000 });
      setZones(res.data.zones || []);
    } catch {} finally { setLoading(false); }
  };

  const scoreColor = (score) => {
    if (score > 70) return 'text-red-600 bg-red-50';
    if (score > 50) return 'text-orange-600 bg-orange-50';
    if (score > 35) return 'text-amber-600 bg-amber-50';
    return 'text-green-700 bg-green-50';
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Safety Zone Map</h1>
            <p className="text-gray-500 text-sm mt-1">Contextual awareness for your area</p>
          </div>
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-orange-200">
            ⚠ DEMO / PROTOTYPE DATA
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
          Zone scores are context indicators for demonstration purposes. They are NOT crime statistics,
          predictions, or safety ratings. Do not rely on these for real safety decisions.
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SafetyZoneMap zones={zones} userPosition={position} height="500px" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Nearby Zones</h2>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading zones...</div>
            ) : (
              <div className="space-y-2">
                {zones.map((zone, i) => (
                  <div key={i} onClick={() => setSelected(zone)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${selected?.name === zone.name ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{zone.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(zone.contextScore)}`}>
                        {zone.contextScore}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${zone.contextScore > 60 ? 'bg-orange-500' : zone.contextScore > 40 ? 'bg-yellow-400' : 'bg-green-500'}`}
                        style={{ width: `${zone.contextScore}%` }}
                      />
                    </div>
                    {zone.isDemo && <span className="text-xs text-gray-400">Demo data</span>}
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{selected.name}</h3>
                <div className="space-y-1 text-xs text-gray-500">
                  {Object.entries(selected.factors || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k.replace('Factor', ' Factor')}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-500 mt-2">⚠ Prototype data only</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
