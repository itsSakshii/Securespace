import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-xl">SafetyNet</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white">Sign In</Link>
          <Link to="/register" className="px-4 py-2 text-sm bg-brand rounded-lg hover:bg-brand-dark">Get Started</Link>
          <Link to="/demo" className="px-4 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700">Live Demo</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-300 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          IndustrySolve Hackathon 2026, IIIT Delhi — Problem Statement 7
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
          Adaptive Women's<br />
          <span className="text-brand">Safety Network</span>
        </h1>
        <p className="text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
          Physical wearable SOS → Adaptive evidence engine → Nearest human responder
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Hardware-ready prototype. General Guard & Rapid Guard network.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register" className="px-8 py-3.5 bg-brand rounded-xl font-semibold hover:bg-brand-dark text-lg">
            Create Account
          </Link>
          <Link to="/demo" className="px-8 py-3.5 bg-gray-800 border border-gray-700 rounded-xl font-semibold hover:bg-gray-700 text-lg">
            See Demo →
          </Link>
        </div>
      </section>

      {/* Product Flow */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-2xl font-bold text-gray-200 mb-10">How It Works</h2>
        <div className="flex flex-wrap justify-center gap-2 items-center text-sm text-gray-400">
          {['User presses SOS button', 'Wearable sends BLE event', 'Phone gets GPS context', 'Adaptive engine evaluates', 'Protection level set', 'Nearest responder found', 'Guard accepts & responds', 'Incident resolved'].map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-center">
                <span className="text-brand font-bold text-xs block">{i + 1}</span>
                <span>{step}</span>
              </div>
              {i < arr.length - 1 && <span className="text-gray-600">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-2xl font-bold text-gray-200 mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📟', title: 'Physical Wearable', desc: 'ESP32-S3 BLE bracelet with hardware SOS button. Simulator included for prototyping.' },
              { icon: '🧠', title: 'Adaptive Evidence Engine', desc: 'SOS is primary. Movement, voice, zone context are supporting signals. No false AI claims.' },
              { icon: '🛡️', title: 'Nearest Human Help', desc: 'General Guard and Rapid Guard matched by distance + verification + availability.' },
              { icon: '⚡', title: 'Real-time Updates', desc: 'Socket.IO keeps user and responder dashboards in sync instantly.' },
              { icon: '🗺️', title: 'Safety Zone Intelligence', desc: 'Context-aware zone scoring. DEMO data clearly marked. Not crime statistics.' },
              { icon: '🔐', title: 'Privacy-first', desc: 'No continuous audio recording. Location shared only during active emergency.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                <span className="text-3xl mb-3 block">{icon}</span>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOS First principle */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
          <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚨</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">SOS-First Design</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            The physical SOS button is the primary emergency trigger. AI and sensor signals are supporting evidence
            that adapt the response — they do not independently declare emergencies. No system can guarantee
            perfect detection. We design for human judgment.
          </p>
        </div>
      </section>

      <footer className="text-center py-8 text-gray-600 text-sm border-t border-gray-800">
        SafetyNet — Adaptive Women's Safety Network · IndustrySolve Hackathon 2026, IIIT Delhi · Prototype
      </footer>
    </div>
  );
}
