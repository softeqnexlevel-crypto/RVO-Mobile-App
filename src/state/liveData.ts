// src/state/liveData.ts
// Live plant data from the SAME backend as the website:
//   - GET  {API}/api/current        -> { rawKey: value, ... }
//   - Socket.IO event "plc-data"    -> { parameter, value, timestamp, unit, simulated }
// Needs:  npm i socket.io-client     and   EXPO_PUBLIC_API_URL=https://your-server (see .env.example)
import { useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { KEY_MAPPING, SENSOR_KEYS, normalizeOnOff, unitFor } from '../data/keyMapping';
import { API, api } from '../lib/api';
import { getAccessToken } from '../lib/tokens';

const FRESH_MS = 60_000;      // data older than this is "stale"
const POLL_MS = 15_000;       // re-read /api/current this often, even while the socket is up (see below)
const POLL_KEEP_MS = 20_000;  // a polled snapshot never overwrites a value the socket updated more recently than this
const EMIT_MS = 500;          // batch UI updates; the PLC can send many tags per second

type Entry = { value: unknown; timestamp: string; unit: string };

let data: Record<string, Entry> = {};
let connected = false;
let error: string | null = API ? null : 'EXPO_PUBLIC_API_URL is not set';
let lastUpdate: string | null = null;
let started = false;
let socket: Socket | null = null;

/* ---------- key resolution ----------
   The backend may send a tag with a "siemens200smart-" prefix, or with different letter case
   (e.g. SystemDailyRunHrs vs SystemDailyRunhrs). Resolve every raw key to the app's tag name:
   exact mapping -> case-insensitive mapping -> prefix stripped -> as-is. */
const KNOWN_TAGS = [
  ...SENSOR_KEYS,
  'RO5-SystemActive', 'RO5-SystemOperation', 'RO5-SystemMode', 'RO5-ServiceRunhrs', 'RO5-SystemDailyRunHrs',
  'RO5-HPPpump', 'RO5-Feedpump', 'RO5-PrefilterBackwash', 'RO5-PrefilterBackwashing',
  'RO5-AntiscalantDosingActive', 'RO5-AntiscalantDaily',
];
const LOWER = new Map<string, string>();
Object.entries(KEY_MAPPING).forEach(([k, v]) => { LOWER.set(k.toLowerCase(), v); LOWER.set(v.toLowerCase(), v); });
KNOWN_TAGS.forEach((t) => LOWER.set(t.toLowerCase(), t));
const PREFIX = /^siemens200smart[-_/]/i;
const seenRaw = new Set<string>();
const rawSeen = new Map<string, string>(); // every raw key the backend has sent -> the app tag it resolved to

function resolveKey(raw: string): string {
  const exact = KEY_MAPPING[raw];
  if (exact) return exact;
  // Try the key as sent, without the device prefix, with "/" turned into "-" (RO5/SystemRunhrs),
  // and with the "RO5-" prefix added when the backend sends the bare PLC name (SystemRunhrs).
  const noPrefix = raw.trim().replace(PREFIX, '');
  const dashed = noPrefix.replace(/\//g, '-');
  const withDevice = /^ro5-/i.test(dashed) ? dashed : `RO5-${dashed}`;
  let hit: string | undefined;
  for (const c of [raw, noPrefix, dashed, withDevice]) {
    hit = LOWER.get(c.toLowerCase());
    if (hit) break;
  }
  const key = hit ?? dashed;
  // Dev only: print each key the app doesn't recognise, once, so a missing tag is easy to spot.
  if (__DEV__ && !hit && !seenRaw.has(raw)) { seenRaw.add(raw); console.log('[LIVE] unmapped key:', raw, '->', key); }
  return key;
}

export type LiveSnapshot = ReturnType<typeof build>;

function build() {
  const now = Date.now();
  const sensorCount = connected ? SENSOR_KEYS.filter((k) => data[k] !== undefined).length : 0;
  const isFresh = connected && !!lastUpdate && now - new Date(lastUpdate).getTime() < FRESH_MS;
  const snapData = data;
  return {
    /** Latest value of a tag, or null if the backend hasn't sent it. Bits arrive as 'ON' / 'OFF'. */
    get: (tag: string): unknown => (snapData[tag] ? snapData[tag].value : null),
    /** { timestamp, unit } of the last message for a tag, or null. */
    meta: (tag: string): { timestamp: string; unit: string } | null => (snapData[tag] ? { timestamp: snapData[tag].timestamp, unit: snapData[tag].unit } : null),
    /** Debug: every raw key received so far and the app tag it resolved to. */
    debugKeys: (): [string, string][] => Array.from(rawSeen.entries()),
    connected,
    error,
    lastUpdate,
    sensorCount,
    isFresh,
    /** TODO: expose a "today's production" figure from the backend (the web gets it from the database). */
    dailyProduction: null as number | null,
    refresh: () => fetchInitial(true),
  };
}

let snap = build();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

function touch() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (!dirty) return;
    dirty = false;
    snap = build();
    subs.forEach((f) => f());
  }, EMIT_MS);
}

function put(rawKey: string, value: unknown, timestamp: string, unit?: string, keepNewerThanMs = 0) {
  const key = resolveKey(rawKey);
  // A polled snapshot must not roll back a value the socket has just updated.
  if (keepNewerThanMs && data[key] && Date.now() - new Date(data[key].timestamp).getTime() < keepNewerThanMs) return;
  rawSeen.set(rawKey, key);
  // Dev only: show how the run-hours keys arrive (raw key, resolved tag, value), once each.
  if (__DEV__ && /run/i.test(rawKey) && !seenRaw.has(`run:${rawKey}`)) { seenRaw.add(`run:${rawKey}`); console.log('[LIVE] run-hours key:', rawKey, '->', key, '=', value); }
  let v = value;
  // Same rule as the web: only the ON/OFF doser bit is normalised; the daily total stays numeric.
  if ((key === 'RO5-AntiscalantDosingActive' || rawKey.includes('Antiscalant')) && key !== 'RO5-AntiscalantDaily') v = normalizeOnOff(value);
  data[key] = { value: v, timestamp, unit: unit || unitFor(key) };
}

// /api/current does NOT always contain every tag: slow ones (SystemRunhrs, SystemDailyRunHrs, SystemActive)
// come and go between responses. So it is re-read on a timer and merged into what is already known: tags that
// are present are updated, tags that are missing keep their last known value (never blanked).
// `markFresh` is true for the connect-time read and while the socket is down; a background poll while the
// socket is up must not make stale data look fresh.
async function fetchInitial(markFresh = true) {
  if (!API) return;
  try {
    const readings = await api<Record<string, unknown>>('/api/current', { timeoutMs: 10_000 });
    const now = new Date().toISOString();
    Object.entries(readings).forEach(([k, v]) => put(k, v, now, undefined, markFresh ? 0 : POLL_KEEP_MS));
    if (markFresh) lastUpdate = now;
    error = null;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch data';
  }
  touch();
}

function start() {
  if (started || !API) return;
  started = true;

  socket = io(API, { auth: (cb) => cb({ token: getAccessToken() }), transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 10_000 });
  socket.on('connect', () => { connected = true; error = null; fetchInitial(); touch(); });
  socket.on('disconnect', () => { connected = false; touch(); });
  socket.on('connect_error', (e) => { connected = false; error = `Cannot reach server (${e.message})`; fetchInitial(); touch(); });
  socket.on('plc-data', (m: { parameter: string; value: unknown; timestamp?: string; unit?: string }) => {
    if (!m || !m.parameter) return;
    const ts = m.timestamp || new Date().toISOString();
    put(m.parameter, m.value, ts, m.unit);
    lastUpdate = ts;
    touch();
  });

  setInterval(() => { fetchInitial(!connected); }, POLL_MS); // always poll; only count it as fresh while the socket is down
  setInterval(touch, 10_000); // lets "fresh / stale" flip even when nothing arrives
}

const subscribe = (cb: () => void) => { start(); subs.add(cb); return () => { subs.delete(cb); }; };
const getSnapshot = () => snap;

export function useLiveData() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 'ON'/'OFF'/booleans/numeric strings -> a number for charts; text states like "FILTER" -> null. */
export function toChartNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    if (s === 'ON' || s === 'TRUE') return 1;
    if (s === 'OFF' || s === 'FALSE') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Call after sign-in / sign-out: drop cached values and reconnect so the socket uses the current token. */
export function resetLive() {
  data = {};
  lastUpdate = null;
  if (socket) { socket.disconnect(); socket.connect(); }
  touch();
}