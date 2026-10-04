/**
 * In-browser mock of the SafetyNet backend (demo mode).
 *
 * - Pure JS, no network. State lives in localStorage so it survives refreshes (and is shared by tabs).
 * - `handleRequest()` mimics every REST route the frontend calls.
 * - Incident lifecycle is time-driven: SOS -> 10s cancel window -> GUARD_NOTIFIED -> (optional auto responder).
 * - Realtime events are pushed through `demoBus` (the fake socket.io server).
 */
import { demoBus } from './demoBus.js';

// ───────────────────────── Tunables ─────────────────────────
const DB_KEY = 'sn_demo_db_v1';
export const CANCEL_WINDOW_SEC = 10;

// If no human guard picks the incident up, a simulated responder walks it through the flow
// so a single-person demo still shows the full lifecycle. Set AUTO_RESPOND=false to disable.
export const AUTO_RESPOND = true;
const AUTO_PLAN_SEC = { ACCEPTED: 22, RESPONDING: 30, ARRIVED: 38, RESOLVED: 48 }; // seconds after SOS

const ORDER = ['INCIDENT_CREATED', 'GUARD_NOTIFIED', 'ACCEPTED', 'RESPONDING', 'ARRIVED', 'HANDOFF', 'RESOLVED'];
const CLOSED = ['RESOLVED', 'CANCELLED'];
const AUTO_GUARD = { _id: 'auto_guard', name: 'Neha Kapoor', type: 'RAPID_GUARD' };

// ───────────────────────── Storage ─────────────────────────
const memoryStore = {};
const storage = {
  get(key) {
    let v = null;
    try { v = globalThis.localStorage?.getItem(key) ?? null; } catch { /* ignore */ }
    return v ?? memoryStore[key] ?? null;
  },
  set(key, value) {
    memoryStore[key] = value;
    try { globalThis.localStorage?.setItem(key, value); } catch { /* ignore */ }
  },
};

// ───────────────────────── Demo zones (around IIIT Delhi / Delhi-NCR) ─────────────────────────
const ZONES = [
  { name: 'IIIT Delhi / Okhla Phase III', lat: 28.5450, lng: 77.2690, radius: 700, contextScore: 32, factors: { lightingFactor: 74, footfallFactor: 68, transitFactor: 71, timeFactor: 40 } },
  { name: 'Nehru Place', lat: 28.5494, lng: 77.2501, radius: 800, contextScore: 58, factors: { lightingFactor: 55, footfallFactor: 80, transitFactor: 85, timeFactor: 62 } },
  { name: 'Kalkaji', lat: 28.5400, lng: 77.2588, radius: 650, contextScore: 47, factors: { lightingFactor: 60, footfallFactor: 66, transitFactor: 70, timeFactor: 50 } },
  { name: 'Lajpat Nagar', lat: 28.5677, lng: 77.2433, radius: 750, contextScore: 64, factors: { lightingFactor: 52, footfallFactor: 88, transitFactor: 79, timeFactor: 70 } },
  { name: 'Saket', lat: 28.5245, lng: 77.2066, radius: 800, contextScore: 29, factors: { lightingFactor: 82, footfallFactor: 72, transitFactor: 76, timeFactor: 35 } },
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, radius: 900, contextScore: 52, factors: { lightingFactor: 70, footfallFactor: 90, transitFactor: 92, timeFactor: 55 } },
  { name: 'Noida Sector 62', lat: 28.6270, lng: 77.3649, radius: 900, contextScore: 41, factors: { lightingFactor: 66, footfallFactor: 60, transitFactor: 64, timeFactor: 45 } },
  { name: 'Noida Sector 128', lat: 28.5355, lng: 77.3910, radius: 1000, contextScore: 78, factors: { lightingFactor: 38, footfallFactor: 35, transitFactor: 42, timeFactor: 82 } },
];

const zonePublic = (z) => ({
  name: z.name,
  coordinates: { type: 'Point', coordinates: [z.lng, z.lat] },
  radius: z.radius,
  contextScore: z.contextScore,
  factors: { ...z.factors },
  isDemo: true,
});

function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestZone(lat, lng) {
  let best = ZONES[0];
  let bestD = Infinity;
  for (const z of ZONES) {
    const d = distanceM(lat, lng, z.lat, z.lng);
    if (d < bestD) { best = z; bestD = d; }
  }
  return best;
}

// ───────────────────────── Helpers ─────────────────────────
const iso = (ms) => new Date(ms).toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };

// ───────────────────────── Evidence engine ─────────────────────────
function buildSignals(flags, zone) {
  return [
    { type: 'SOS_BUTTON', label: 'SOS button pressed', value: true },
    { type: 'MOVEMENT', label: 'Abnormal movement detected', value: !!flags.MOVEMENT },
    { type: 'VOICE', label: 'Distress voice detected', value: !!flags.VOICE },
    { type: 'SAFETY_CHECK_FAILED', label: 'Safety check failed', value: !!flags.SAFETY_CHECK_FAILED },
    { type: 'ZONE_CONTEXT', label: 'High-attention zone', value: (zone?.contextScore || 0) > 60 },
  ];
}

// SOS is always the primary trigger (base 60). Everything else is supporting evidence only.
function recompute(inc) {
  const flags = inc.flags || {};
  const evidence = [];
  if (flags.MOVEMENT) evidence.push({ type: 'ABNORMAL_MOVEMENT', contribution: 15 });
  if (flags.VOICE) evidence.push({ type: 'DISTRESS_VOICE', contribution: 15 });
  if (flags.SAFETY_CHECK_FAILED) evidence.push({ type: 'SAFETY_CHECK_FAILED', contribution: 10 });
  if ((inc.zone?.contextScore || 0) > 60) evidence.push({ type: 'HIGH_ATTENTION_ZONE', contribution: 10 });

  const confidence = Math.min(100, 60 + evidence.reduce((s, e) => s + e.contribution, 0));
  inc.signals = buildSignals(flags, inc.zone);
  inc.confidence = confidence;
  inc.protectionLevel = confidence >= 90 ? 'CRITICAL' : confidence >= 80 ? 'CAREFUL' : 'WATCH';
  inc.adaptiveSafety = {
    level: confidence >= 80 ? 'HIGH' : confidence >= 70 ? 'MEDIUM' : 'NORMAL',
    confidence,
    cancellationDeadline: inc.cancellationDeadline,
    evidence,
  };
  return inc;
}

// ───────────────────────── DB ─────────────────────────
function nextIncidentId(db) {
  db.counter += 1;
  return `INC-${new Date().getFullYear()}-${db.counter}`;
}

function makeIncident(db, { owner, loc, flags = {}, createdAt, finalStatus = null, responder = null, seed = false, manual = false }) {
  const zone = zonePublic(nearestZone(loc.lat, loc.lng));
  const zoneBrief = { name: zone.name, contextScore: zone.contextScore };
  const inc = {
    _id: 'inc_' + rid(),
    incidentId: nextIncidentId(db),
    userId: owner._id,
    userName: owner.name,
    status: 'INCIDENT_CREATED',
    location: { address: loc.address, coordinates: [loc.lng, loc.lat] },
    zone: zoneBrief,
    flags: { ...flags },
    cancellationWindow: CANCEL_WINDOW_SEC,
    cancellationDeadline: iso(createdAt + CANCEL_WINDOW_SEC * 1000),
    createdAt: iso(createdAt),
    updatedAt: iso(createdAt),
    assignedResponder: null,
    assignedResponderId: null,
    assignedResponderType: null,
    events: [{ eventType: 'INCIDENT_CREATED', timestamp: iso(createdAt) }],
    autoPlan: [],
    seed,
  };
  recompute(inc);

  if (finalStatus === 'CANCELLED') {
    inc.status = 'CANCELLED';
    inc.events.push({ eventType: 'CANCELLED', timestamp: iso(createdAt + 6000) });
  } else if (finalStatus === 'RESOLVED') {
    const offs = { GUARD_NOTIFIED: 10, ACCEPTED: 40, RESPONDING: 70, ARRIVED: 300, HANDOFF: 360, RESOLVED: 600 };
    Object.entries(offs).forEach(([s, sec]) => inc.events.push({ eventType: s, timestamp: iso(createdAt + sec * 1000) }));
    inc.status = 'RESOLVED';
    if (responder) {
      inc.assignedResponder = { _id: responder._id, name: responder.name };
      inc.assignedResponderId = responder._id;
      inc.assignedResponderType = responder.role || responder.type;
    }
  } else {
    // live incident: schedule time-driven transitions
    inc.autoPlan = [{ at: createdAt + CANCEL_WINDOW_SEC * 1000, status: 'GUARD_NOTIFIED' }];
    if (AUTO_RESPOND && !manual) {
      Object.entries(AUTO_PLAN_SEC).forEach(([status, sec]) => inc.autoPlan.push({ at: createdAt + sec * 1000, status }));
    }
  }
  db.incidents.push(inc);
  return inc;
}

function seedHistory(db, user) {
  const now = Date.now();
  const day = 86400000;
  if (user.role === 'USER') {
    const guard = db.users.find((u) => u.role === 'GENERAL_GUARD') || AUTO_GUARD;
    makeIncident(db, { owner: user, seed: true, finalStatus: 'RESOLVED', responder: guard, createdAt: now - 3 * day,
      loc: { address: 'Nehru Place Metro Station, New Delhi', lat: 28.5513, lng: 77.2519 }, flags: { MOVEMENT: true, VOICE: true } });
    makeIncident(db, { owner: user, seed: true, finalStatus: 'CANCELLED', createdAt: now - 8 * day,
      loc: { address: 'IIIT Delhi Main Gate, Okhla', lat: 28.5450, lng: 77.2690 } });
    makeIncident(db, { owner: user, seed: true, finalStatus: 'RESOLVED', responder: AUTO_GUARD, createdAt: now - 19 * day,
      loc: { address: 'Lajpat Nagar Central Market', lat: 28.5677, lng: 77.2433 }, flags: { SAFETY_CHECK_FAILED: true } });
  } else {
    // History for responders: past incidents raised by someone else (not a real demo account,
    // otherwise they would leak into that user's own history).
    const owner = { _id: 'u_seed_citizen', name: 'Ananya Gupta' };
    makeIncident(db, { owner, seed: true, finalStatus: 'RESOLVED', responder: user, createdAt: now - 5 * day,
      loc: { address: 'Saket District Centre, New Delhi', lat: 28.5282, lng: 77.2190 }, flags: { VOICE: true } });
    makeIncident(db, { owner, seed: true, finalStatus: 'RESOLVED', responder: user, createdAt: now - 12 * day,
      loc: { address: 'Kalkaji Mandir Road', lat: 28.5400, lng: 77.2588 }, flags: { MOVEMENT: true } });
  }
}

function addUser(db, { name, email, role = 'USER', phone = '' }) {
  const user = {
    _id: 'u_' + rid(),
    name,
    email: email.toLowerCase(),
    phone,
    role,
    availability: true,
    emergencyContacts: role === 'USER'
      ? [
          { _id: 'c_' + rid(), name: 'Anita Sharma', phone: '+91-9810000001', relationship: 'Mother', notifyOnSOS: true },
          { _id: 'c_' + rid(), name: 'Rahul Sharma', phone: '+91-9810000002', relationship: 'Brother', notifyOnSOS: true },
        ]
      : [],
  };
  db.users.push(user);
  seedHistory(db, user);
  return user;
}

function freshDb() {
  const db = { users: [], incidents: [], wearables: {}, counter: 1000 };
  addUser(db, { name: 'Priya Sharma', email: 'user@demo.com', role: 'USER', phone: '+91-9876543210' });
  addUser(db, { name: 'Rohan Verma', email: 'guard1@demo.com', role: 'GENERAL_GUARD', phone: '+91-9876500001' });
  addUser(db, { name: 'Aman Singh', email: 'rapidguard@demo.com', role: 'RAPID_GUARD', phone: '+91-9876500002' });
  return db;
}

function loadDb() {
  try {
    const raw = storage.get(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (db && Array.isArray(db.users) && Array.isArray(db.incidents)) return db;
    }
  } catch { /* fall through */ }
  const db = freshDb();
  saveDb(db);
  return db;
}

function saveDb(db) {
  storage.set(DB_KEY, JSON.stringify(db));
}

// ───────────────────────── Serialisation ─────────────────────────
const publicUser = (u) => ({
  _id: u._id,
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  emergencyContacts: clone(u.emergencyContacts || []),
});

function publicIncident(inc) {
  // eslint-disable-next-line no-unused-vars
  const { autoPlan, events, flags, userId, seed, ...rest } = inc;
  return clone({ ...rest, userId });
}

// ───────────────────────── Incident state machine ─────────────────────────
const EVENT_FOR_STATUS = {
  GUARD_NOTIFIED: ['responder_notified', 'incident:escalated'],
  ACCEPTED: ['responder_accepted'],
  RESPONDING: ['responder_responding'],
  ARRIVED: ['responder_arrived'],
  RESOLVED: ['incident_resolved'],
};

function applyStatus(inc, status, atMs) {
  inc.status = status;
  inc.updatedAt = iso(atMs);
  inc.events.push({ eventType: status, timestamp: iso(atMs) });
  if (status === 'ACCEPTED' && !inc.assignedResponder) {
    inc.assignedResponder = { _id: AUTO_GUARD._id, name: AUTO_GUARD.name };
    inc.assignedResponderId = AUTO_GUARD._id;
    inc.assignedResponderType = AUTO_GUARD.type;
  }
}

function statusEvents(inc, status) {
  const pub = publicIncident(inc);
  const out = [['incident_updated', { incident: pub }]];
  (EVENT_FOR_STATUS[status] || []).forEach((ev) => out.push([ev, { incident: pub, incidentId: inc.incidentId }]));
  return out;
}

// Apply every time-driven step that is due. Idempotent, so it is safe to call from anywhere.
function advance(db, now = Date.now()) {
  const emits = [];
  for (const inc of db.incidents) {
    if (!inc.autoPlan?.length) continue;
    while (inc.autoPlan.length && inc.autoPlan[0].at <= now) {
      const step = inc.autoPlan.shift();
      if (CLOSED.includes(inc.status)) { inc.autoPlan = []; break; }
      applyStatus(inc, step.status, step.at);
      emits.push(...statusEvents(inc, step.status));
    }
  }
  return emits;
}

function announce(emits) {
  emits.forEach(([event, payload]) => demoBus.broadcast(event, payload));
}

// Called on a timer by the browser adapter so UI gets live updates without any request.
export function tick() {
  const db = loadDb();
  if (!db.incidents.some((i) => i.autoPlan?.length)) return;
  const emits = advance(db);
  if (emits.length) {
    saveDb(db);
    announce(emits);
  }
}

// ───────────────────────── Routing ─────────────────────────
const routes = [];
function add(method, pattern, handler, opts = {}) {
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, '(?<$1>[^/]+)') + '/?$');
  routes.push({ method, re, handler, public: !!opts.public });
}

const ok = (data, status = 200) => ({ status, data: { success: true, ...data } });

const requireGuard = (user) => {
  if (!['GENERAL_GUARD', 'RAPID_GUARD'].includes(user.role)) fail(403, 'Only responders can perform this action');
};

function findIncident(db, id) {
  const inc = db.incidents.find((i) => i.incidentId === id || i._id === id);
  if (!inc) fail(404, 'Incident not found');
  return inc;
}

const inferRole = (email) => {
  const e = email.toLowerCase();
  if (e.includes('rapid')) return 'RAPID_GUARD';
  if (e.includes('guard')) return 'GENERAL_GUARD';
  return 'USER';
};

const nameFromEmail = (email) =>
  email.split('@')[0].replace(/[._\-\d]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Demo User';

const tokenFor = (user) => `demo.${user._id}`;

// ── Auth ──
add('POST', '/auth/login', ({ db, body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !body.password) fail(400, 'Email and password are required');
  // Demo mode: any credentials work. Unknown emails get a fresh demo account.
  const user = db.users.find((u) => u.email === email)
    || addUser(db, { name: nameFromEmail(email), email, role: inferRole(email) });
  return ok({ token: tokenFor(user), user: publicUser(user) });
}, { public: true });

add('POST', '/auth/register', ({ db, body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  if (!body.name || !email || !body.password) fail(400, 'Name, email and password are required');
  if (String(body.password).length < 6) fail(400, 'Password must be at least 6 characters');
  const role = ['USER', 'GENERAL_GUARD', 'RAPID_GUARD'].includes(body.role) ? body.role : 'USER';
  let user = db.users.find((u) => u.email === email);
  if (user) {
    Object.assign(user, { name: body.name, phone: body.phone || user.phone, role }); // demo: re-register just updates
  } else {
    user = addUser(db, { name: body.name, email, role, phone: body.phone || '' });
  }
  return ok({ token: tokenFor(user), user: publicUser(user) }, 201);
}, { public: true });

add('GET', '/auth/me', ({ user }) => ok({ user: publicUser(user) }));

// ── Users ──
add('GET', '/users/profile', ({ user }) => ok({ user: publicUser(user) }));
add('PATCH', '/users/profile', ({ user, body }) => {
  if (body.name) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone;
  return ok({ user: publicUser(user) });
});
add('PATCH', '/users/emergency-contacts', ({ user, body }) => {
  const list = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : fail(400, 'emergencyContacts must be an array');
  user.emergencyContacts = list.map((c) => ({ ...c, _id: c._id || 'c_' + rid() }));
  return ok({ user: publicUser(user) });
});

// ── Wearables ──
add('POST', '/wearables/connect', ({ db, user, body }) => {
  const w = {
    deviceId: body.deviceId || 'BAND-001',
    battery: body.battery ?? 86,
    connected: true,
    isSimulator: true,
    firmwareVersion: '1.0.0',
    lastEvent: null,
    recentEvents: [],
  };
  db.wearables[user._id] = w;
  return ok({ wearable: clone(w) });
});

const getWearable = (db, user) =>
  db.wearables[user._id] || (db.wearables[user._id] = { deviceId: 'BAND-001', battery: 86, connected: true, isSimulator: true, firmwareVersion: '1.0.0', lastEvent: null, recentEvents: [] });

add('GET', '/wearables/:id', ({ db, user }) => ok({ wearable: clone(getWearable(db, user)) }));

add('POST', '/wearables/:id/event', ({ db, user, body }) => {
  const w = getWearable(db, user);
  w.lastEvent = body.eventType;
  w.recentEvents = [...(w.recentEvents || []).slice(-9), { type: body.eventType, at: Date.now() }];
  return ok({ wearable: clone(w) });
});

add('PATCH', '/wearables/:id/battery', ({ db, user, body }) => {
  const w = getWearable(db, user);
  if (typeof body.battery === 'number') w.battery = body.battery;
  return ok({ wearable: clone(w) });
});

add('POST', '/wearables/:id/sos', ({ db, user, body, manual, emit }) => {
  const existing = db.incidents.find((i) => i.userId === user._id && !CLOSED.includes(i.status));
  if (existing) fail(409, 'You already have an active incident', { incident: publicIncident(existing) });

  const w = getWearable(db, user);
  const now = Date.now();
  const lat = Number(body.location?.lat) || 28.5450;
  const lng = Number(body.location?.lng) || 77.2690;
  const zone = nearestZone(lat, lng);
  const generic = !body.location?.address || /^(current|demo) location$/i.test(body.location.address);
  const address = generic ? `${zone.name} (approx.)` : body.location.address;

  // supporting evidence = explicit signals + wearable sensor events from the last 2 minutes
  const flags = {};
  const sig = body.signals || {};
  if (sig.movement) flags.MOVEMENT = true;
  if (sig.voice) flags.VOICE = true;
  if (sig.safetyCheckFailed) flags.SAFETY_CHECK_FAILED = true;
  (w.recentEvents || []).forEach((e) => {
    if (now - e.at < 120000 && (e.type === 'MOVEMENT' || e.type === 'VOICE')) flags[e.type] = true;
  });

  const inc = makeIncident(db, { owner: user, loc: { lat, lng, address }, flags, createdAt: now, manual });
  w.lastEvent = 'SOS_TRIGGERED';
  const pub = publicIncident(inc);
  emit('incident_created', { incident: pub });
  return ok({ incident: pub }, 201);
});

// ── Incidents ──
add('GET', '/incidents/active', ({ db, user }) => {
  const mine = db.incidents
    .filter((i) => !CLOSED.includes(i.status) && (i.userId === user._id || i.assignedResponderId === user._id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return ok({ incident: mine ? publicIncident(mine) : null });
});

add('GET', '/incidents', ({ db, user }) => {
  const isGuard = ['GENERAL_GUARD', 'RAPID_GUARD'].includes(user.role);
  const list = db.incidents
    .filter((i) => (isGuard ? i.assignedResponderId === user._id : i.userId === user._id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicIncident);
  return ok({ incidents: list });
});

add('GET', '/incidents/:id/events', ({ db, params }) => ok({ events: clone(findIncident(db, params.id).events) }));
add('GET', '/incidents/:id', ({ db, params }) => ok({ incident: publicIncident(findIncident(db, params.id)) }));

add('POST', '/incidents/:id/cancel', ({ db, params, emit }) => {
  const inc = findIncident(db, params.id);
  if (!['INCIDENT_CREATED', 'GUARD_NOTIFIED'].includes(inc.status)) fail(400, 'This incident can no longer be cancelled');
  inc.autoPlan = [];
  applyStatus(inc, 'CANCELLED', Date.now());
  statusEvents(inc, 'CANCELLED').forEach(([e, p]) => emit(e, p));
  return ok({ incident: publicIncident(inc) });
});

add('POST', '/incidents/:id/evidence', ({ db, params, body, emit }) => {
  const inc = findIncident(db, params.id);
  if (CLOSED.includes(inc.status)) fail(400, 'Incident is closed');
  const map = { ABNORMAL_MOVEMENT: 'MOVEMENT', DISTRESS_VOICE: 'VOICE', SAFETY_CHECK_FAILED: 'SAFETY_CHECK_FAILED' };
  const flag = map[body.type];
  if (!flag) fail(400, 'Unknown evidence type');
  inc.flags[flag] = true;
  recompute(inc);
  inc.updatedAt = iso(Date.now());
  const pub = publicIncident(inc);
  emit('incident:adaptive-update', { incidentId: inc.incidentId, adaptiveSafety: pub.adaptiveSafety });
  emit('incident_updated', { incident: pub });
  return ok({ incident: pub });
});

function guardStep(target, allowedFrom) {
  return ({ db, user, params, emit }) => {
    requireGuard(user);
    const inc = findIncident(db, params.id);

    if (target === 'ACCEPTED' && ORDER.indexOf(inc.status) >= ORDER.indexOf('ACCEPTED') && inc.assignedResponderId !== user._id) {
      fail(409, 'Incident already accepted by another responder');
    }
    if (inc.status === 'CANCELLED') fail(409, 'Incident was cancelled by the user');
    // idempotent: already at / past the requested step (e.g. the simulated responder got there first)
    if (ORDER.indexOf(inc.status) >= ORDER.indexOf(target)) return ok({ incident: publicIncident(inc) });
    if (!allowedFrom.includes(inc.status)) {
      fail(400, inc.status === 'INCIDENT_CREATED'
        ? 'Incident has not been escalated to responders yet'
        : `Cannot mark ${target} while incident is ${inc.status}`);
    }

    inc.autoPlan = []; // a real responder takes over from the simulated one
    inc.assignedResponder = { _id: user._id, name: user.name };
    inc.assignedResponderId = user._id;
    inc.assignedResponderType = user.role;
    applyStatus(inc, target, Date.now());
    statusEvents(inc, target).forEach(([e, p]) => emit(e, p));
    return ok({ incident: publicIncident(inc) });
  };
}
add('POST', '/incidents/:id/accept', guardStep('ACCEPTED', ['GUARD_NOTIFIED']));
add('POST', '/incidents/:id/responding', guardStep('RESPONDING', ['ACCEPTED']));
add('POST', '/incidents/:id/arrived', guardStep('ARRIVED', ['RESPONDING']));
add('POST', '/incidents/:id/handoff', guardStep('HANDOFF', ['ARRIVED']));
add('POST', '/incidents/:id/resolve', guardStep('RESOLVED', ['ARRIVED', 'HANDOFF']));

// ── Zones ──
add('GET', '/zones/nearby', ({ query }) => {
  const lat = Number(query.lat) || 28.5450;
  const lng = Number(query.lng) || 77.2690;
  const radius = Number(query.radius) || 5000;
  const ranked = ZONES.map((z) => ({ z, d: distanceM(lat, lng, z.lat, z.lng) })).sort((a, b) => a.d - b.d);
  let picked = ranked.filter((r) => r.d <= radius);
  if (!picked.length) picked = ranked.slice(0, 4); // always show something on the demo map
  return ok({ zones: picked.map((r) => zonePublic(r.z)) });
});

add('GET', '/zones/context', ({ query }) => {
  const z = nearestZone(Number(query.lat) || 28.5450, Number(query.lng) || 77.2690);
  return ok({ zone: zonePublic(z) });
});

// ── Responders ──
add('GET', '/responders/profile', ({ user }) => {
  requireGuard(user);
  return ok({ responder: { _id: user._id, name: user.name, role: user.role, availability: user.availability !== false } });
});

add('PATCH', '/responders/availability', ({ user, body }) => {
  requireGuard(user);
  user.availability = !!body.availability;
  return ok({ responder: { _id: user._id, name: user.name, role: user.role, availability: user.availability } });
});

add('PATCH', '/responders/location', ({ user, body }) => {
  requireGuard(user);
  user.location = body;
  return ok({});
});

add('GET', '/responders/nearby', ({ db }) =>
  ok({ responders: db.users.filter((u) => u.role !== 'USER' && u.availability !== false).map((u) => ({ _id: u._id, name: u.name, role: u.role })) }));

add('GET', '/responders/active-incidents', ({ db, user }) => {
  requireGuard(user);
  const list = db.incidents
    .filter((i) => i.assignedResponderId === user._id && ['ACCEPTED', 'RESPONDING', 'ARRIVED', 'HANDOFF'].includes(i.status))
    .map(publicIncident);
  return ok({ incidents: list });
});

add('GET', '/responders/available-incidents', ({ db, user }) => {
  requireGuard(user);
  const list = db.incidents
    .filter((i) => i.status === 'GUARD_NOTIFIED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicIncident);
  return ok({ incidents: list });
});

// ── Demo helpers ──
add('POST', '/demo/reset', ({ db }) => {
  db.incidents = db.incidents.filter((i) => i.seed);
  db.wearables = {};
  db.users.forEach((u) => { u.availability = true; });
  return ok({});
}, { public: true });

add('GET', '/health', () => ok({ mode: 'demo' }), { public: true });

// ───────────────────────── Dispatcher ─────────────────────────
/**
 * @param {{method:string, path:string, query?:object, body?:object, headers?:object, manual?:boolean}} req
 *   path is relative to /api, e.g. "/auth/login"
 * @returns {{status:number, data:object}}
 */
export function handleRequest({ method, path, query = {}, body = {}, headers = {}, manual = false }) {
  const db = loadDb();
  const emits = advance(db); // lazily apply any due time-driven transitions first
  const collected = [];
  const emit = (event, payload) => collected.push([event, payload]);

  let result;
  try {
    const m = method.toUpperCase();
    const route = routes.find((r) => {
      if (r.method !== m) return false;
      const match = r.re.exec(path);
      if (match) r._params = match.groups || {};
      return !!match;
    });
    if (!route) throw new HttpError(404, `No demo route for ${m} ${path}`);

    let user = null;
    if (!route.public) {
      const auth = String(headers.authorization || headers.Authorization || '');
      const token = auth.replace(/^Bearer\s+/i, '');
      const id = token.startsWith('demo.') ? token.slice(5) : null;
      user = id ? db.users.find((u) => u._id === id) : null;
      if (!user) throw new HttpError(401, 'Not authenticated. Please sign in again.');
    }

    result = route.handler({ db, user, params: route._params, query, body: body || {}, headers, manual, emit });
  } catch (err) {
    if (err instanceof HttpError) {
      result = { status: err.status, data: { success: false, error: err.message, ...err.extra } };
    } else {
      console.error('[demo api] unexpected error', err);
      result = { status: 500, data: { success: false, error: 'Demo server error: ' + (err?.message || 'unknown') } };
    }
  }

  saveDb(db);
  announce([...emits, ...collected]);
  return { status: result.status, data: clone(result.data) };
}

// Test helper
export function __resetDemoDb() {
  storage.set(DB_KEY, JSON.stringify(freshDb()));
}
