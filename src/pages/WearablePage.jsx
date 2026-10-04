import MainLayout from '../layouts/MainLayout';
import WearableSimulator from '../components/WearableSimulator';
import { useNavigate } from 'react-router-dom';
import { useIncident } from '../context/IncidentContext';

export default function WearablePage() {
  const { setActiveIncident } = useIncident();
  const navigate = useNavigate();

  const handleSOS = (incident) => {
    if (incident) {
      setActiveIncident(incident);
      navigate(`/incident/${incident.incidentId}`);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Wearable Device</h1>
          <p className="text-gray-500 text-sm mt-1">Connect and manage your safety bracelet</p>
        </div>

        {/* Hardware note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Hardware-Ready Prototype</p>
              <p className="text-xs text-blue-700 mt-1">
                This simulator represents the <strong>Seeed XIAO ESP32-S3 Sense</strong> wearable bracelet.
                The BLE abstraction layer is ready for real hardware integration.
                Replace simulator with real BLE device without changing core emergency logic.
              </p>
            </div>
          </div>
        </div>

        <WearableSimulator onSOS={handleSOS} compact={false} />

        {/* Info cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">SOS-First Design</h3>
            <p className="text-xs text-gray-500">Physical button is the primary emergency trigger. Sensor events are supporting evidence only.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">BLE Architecture</h3>
            <p className="text-xs text-gray-500">Web Bluetooth API ready. Currently using simulator mode. Swap in real ESP32 when available.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Privacy</h3>
            <p className="text-xs text-gray-500">Microphone events classified locally. Raw audio never transmitted. Location shared only during emergency.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
