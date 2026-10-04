import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = L.divIcon({
  html: `<div style="background:#7c3aed;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function ZoneCircle({ zone }) {
  const score = zone.contextScore || 0;
  const color = score > 70 ? '#ef4444' : score > 50 ? '#f97316' : score > 35 ? '#f59e0b' : '#22c55e';
  const [lng, lat] = zone.coordinates?.coordinates || [77.2090, 28.6139];
  return (
    <Circle
      center={[lat, lng]}
      radius={zone.radius || 500}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 2 }}
    >
      <Popup>
        <div className="text-sm">
          <p className="font-bold">{zone.name}</p>
          <p className="text-gray-500">Context Score: {zone.contextScore}</p>
          <p className="text-xs text-orange-600 mt-1">⚠ DEMO/PROTOTYPE DATA</p>
        </div>
      </Popup>
    </Circle>
  );
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

export default function SafetyZoneMap({ zones = [], userPosition, height = '400px', incidentLocation }) {
  const center = userPosition
    ? [userPosition.lat, userPosition.lng]
    : [28.5450, 77.2690];

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden border border-gray-200 relative">
      {/* DEMO watermark */}
      <div className="absolute top-2 right-2 z-10 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold border border-orange-200">
        DEMO / PROTOTYPE DATA
      </div>

      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap center={center} />

        {/* User location */}
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
            <Popup>
              <p className="text-sm font-semibold">Your Location</p>
              {userPosition.isDefault && <p className="text-xs text-orange-500">Using default location</p>}
            </Popup>
          </Marker>
        )}

        {/* Incident location */}
        {incidentLocation && (
          <Marker position={[incidentLocation.lat, incidentLocation.lng]}>
            <Popup><p className="text-sm font-bold text-red-600">🚨 Incident Location</p></Popup>
          </Marker>
        )}

        {/* Zone circles */}
        {zones.map((zone, i) => <ZoneCircle key={i} zone={zone} />)}
      </MapContainer>
    </div>
  );
}
