// Tiny pub/sub that stands in for socket.io server -> client events.
// Also relays across browser tabs (same origin) so a guard tab and a user tab stay in sync.
const sockets = new Set();
let channel = null;

function deliver(event, payload) {
  sockets.forEach((s) => s._receive(event, payload));
}

try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('safetynet-demo-bus');
    channel.onmessage = (m) => {
      if (m?.data?.event) deliver(m.data.event, m.data.payload);
    };
  }
} catch {
  channel = null;
}

export const demoBus = {
  add: (s) => sockets.add(s),
  remove: (s) => sockets.delete(s),
  broadcast(event, payload) {
    const copy = payload === undefined ? undefined : JSON.parse(JSON.stringify(payload));
    // async, like a real network hop
    setTimeout(() => deliver(event, copy), 30);
    try { channel?.postMessage({ event, payload: copy }); } catch { /* ignore */ }
  },
};
