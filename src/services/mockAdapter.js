import axios, { AxiosError } from 'axios';
import { DEMO_MODE } from '../config';
import { handleRequest, tick } from './mockServer';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  return headers[name] || headers[name.toLowerCase()] || '';
}

function joinUrl(base, url) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!base) return url;
  return base.replace(/\/+$/, '') + '/' + String(url).replace(/^\/+/, '');
}

let installed = false;

export function installMockApi() {
  if (!DEMO_MODE || installed) return;
  installed = true;

  const originalAdapter = axios.defaults.adapter;
  const realAdapter = (config) => axios.getAdapter(originalAdapter, config)(config);

  async function demoAdapter(config) {
    const full = joinUrl(config.baseURL, config.url || '');
    let parsed;
    try { parsed = new URL(full, window.location.origin); } catch { return realAdapter(config); }

    // Only intercept this app's own /api/* calls; everything else goes out normally.
    const sameOrigin = parsed.origin === window.location.origin;
    if (!sameOrigin || !parsed.pathname.startsWith('/api/')) return realAdapter(config);

    const path = parsed.pathname.slice(4); // strip "/api"
    const query = Object.fromEntries(parsed.searchParams.entries());
    Object.assign(query, config.params || {});

    let body = config.data;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    await sleep(180 + Math.random() * 220); // feel like a network call

    const { status, data } = handleRequest({
      method: config.method || 'get',
      path,
      query,
      body: body || {},
      headers: { authorization: getHeader(config.headers, 'Authorization') },
      manual: String(getHeader(config.headers, 'x-demo-manual')) === '1',
    });

    const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
    const valid = config.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300;
    if (valid) return response;
    throw new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      response.request,
      response,
    );
  }

  // Set BEFORE any axios instance is created so every instance (axios.create) inherits it.
  axios.defaults.adapter = demoAdapter;

  // Push time-driven incident transitions (guard notified, auto responder...) to the UI live.
  setInterval(tick, 1000);

  console.info('%c[SafetyNet] Demo mode: using in-browser mock API (no backend needed)', 'color:#7c3aed;font-weight:bold');
}

installMockApi();
