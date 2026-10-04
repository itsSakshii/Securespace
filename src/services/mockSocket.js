import { io as realIo } from 'socket.io-client';
import { demoBus } from './demoBus';
import { DEMO_MODE } from '../config';

class FakeSocket {
  constructor() {
    this.id = 'demo-' + Math.random().toString(36).slice(2, 8);
    this.connected = false;
    this._handlers = new Map();
    this._closed = false;
    setTimeout(() => {
      if (this._closed) return;
      this.connected = true;
      demoBus.add(this);
      this._receive('connect');
    }, 60);
  }
  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(fn);
    return this;
  }
  off(event, fn) {
    if (!fn) this._handlers.delete(event);
    else this._handlers.get(event)?.delete(fn);
    return this;
  }
  emit(event) {
    // client -> server events (join_incident, join_guard_room, ...) need no handling in demo mode
    if (event === 'ping') setTimeout(() => this._receive('pong'), 10);
    return this;
  }
  _receive(event, payload) {
    this._handlers.get(event)?.forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('[demo socket] handler error for', event, e); }
    });
  }
  disconnect() {
    if (this._closed) return this;
    this._closed = true;
    this.connected = false;
    demoBus.remove(this);
    this._receive('disconnect');
    this._handlers.clear();
    return this;
  }
  close() { return this.disconnect(); }
}

// Drop-in replacement for `io` from socket.io-client.
export function io(url, opts) {
  return DEMO_MODE ? new FakeSocket() : realIo(url, opts);
}
