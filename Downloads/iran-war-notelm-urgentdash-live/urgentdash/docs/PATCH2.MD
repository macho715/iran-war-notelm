좋습니다. 이번 단계는 지금 업로드된 preview.html 기준으로 바로 얹을 수 있습니다. 현재 앱은 RouteMap이 아직 SVG ROUTE_GRAPH 기반이고, 이벤트는 buildDiffEvents 결과를 그대로 setTimeline([...diff, ...prev])로 넣고 있어서, 여기에 실도로 geometry fetch / I02 detail 규칙 엔진 / noise gate를 끼우면 됩니다. 또 export_hyie_live.py는 핵심 키만 검사한 뒤 payload를 그대로 hyie_state.json으로 내보내고, backup_urgentdash.py도 필수 스냅샷 키만 검사하므로, 옵션 필드인 route_geo를 추가해도 흐름을 깨지지 않습니다.

실도로 경로는 OSRM Route service의 /route/v1/{profile}/{coordinates}에서 geometries=geojson과 overview=full을 쓰면 polyline geometry를 받을 수 있고, Mapbox Directions도 mapbox/driving·mapbox/driving-traffic 프로필과 최대 25개 좌표를 지원합니다. 또한 React-Leaflet은 MapContainer 하위에서 vector layer의 pathOptions와 eventHandlers를 바꿀 수 있어서 클릭 하이라이트/선택 유지 구현에 그대로 맞습니다.

아래는 React 분리 버전 기준 drop-in patch 세트입니다.

1) src/lib/constants.js에 추가
export const I02_SEGMENTS = [
  { id: "NORMAL", min: 0.00, max: 0.30, severity: "INFO" },
  { id: "DELAYED", min: 0.30, max: 0.50, severity: "WARN" },
  { id: "DISRUPTED", min: 0.50, max: 0.65, severity: "WARN" },
  { id: "SEVERE", min: 0.65, max: 0.80, severity: "ALERT" },
  { id: "CLOSED", min: 0.80, max: 1.01, severity: "ALERT" }
];

export const EVENT_NOISE_WINDOW_MS = 10 * 60 * 1000;

export const ROUTE_EFF_SPIKE_RATIO = 0.25; // +25%
export const ROUTE_EFF_SPIKE_HOURS = 1.5;  // +1.5h
2) src/lib/i02DetailRules.js 신규 파일
function uniq(values = []) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

function normalizeText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

const TAG_RULES = [
  {
    id: "FULL_SUSPENSION",
    label: "전면 중단",
    level: "ALERT",
    re: /(전편\s*(중단|취소)|모든\s*운항\s*(중단|중지)|full\s*suspension|all\s*flights?\s*(suspended|cancelled)|airport\s*closed|runway\s*closed)/i
  },
  {
    id: "PARTIAL_SERVICE",
    label: "부분 운항",
    level: "WARN",
    re: /(부분\s*운항|일부\s*운항|limited\s*(service|operations)|partial\s*(service|operations)|selected\s*flights|reduced\s*operations)/i
  },
  {
    id: "SLOT_RESTRICTION",
    label: "슬롯 제한",
    level: "WARN",
    re: /(slot\s*restriction|slot\s*control|ATFM|departure\s*slot|arrival\s*slot|슬롯\s*제한|이착륙\s*슬롯)/i
  },
  {
    id: "TERMINAL_SPECIFIC",
    label: "터미널별 운영",
    level: "WARN",
    re: /(\bT\d\b|Terminal\s*\d+|터미널\s*\d+)/i
  },
  {
    id: "RESUME_TIME",
    label: "재개 시각 명시",
    level: "INFO",
    re: /((?:재개|resume|reopen).{0,20}\d{1,2}:\d{2}|\d{1,2}:\d{2}.{0,20}(?:재개|resume|reopen))/i
  },
  {
    id: "CARGO_ONLY",
    label: "화물기만",
    level: "WARN",
    re: /(cargo\s*only|cargo-only|freighter\s*only|화물기만)/i
  },
  {
    id: "HUMANITARIAN_ONLY",
    label: "구호/송환편만",
    level: "WARN",
    re: /(repatriation|evacuation|humanitarian|rescue flight|구호편|송환편|대피편)/i
  }
];

const TERMINAL_RE = /\bT\d\b|Terminal\s*\d+|터미널\s*\d+/gi;
const RESUME_TIME_RE = /\b\d{1,2}:\d{2}\s*(?:GST|UTC|LT)?\b|(?:\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2})/gi;

export function parseI02Detail(detail = "") {
  const text = normalizeText(detail);

  const tags = uniq(
    TAG_RULES.filter((rule) => rule.re.test(text)).map((rule) => rule.id)
  );

  const tagLabels = tags.map((id) => TAG_RULES.find((r) => r.id === id)?.label || id);
  const terminals = uniq(text.match(TERMINAL_RE) || []);
  const resumeTimes = uniq(text.match(RESUME_TIME_RE) || []);

  return {
    text,
    tags,
    tagLabels,
    terminals,
    resumeTimes
  };
}

export function diffI02Detail(prevDetail = "", nextDetail = "") {
  const prev = parseI02Detail(prevDetail);
  const next = parseI02Detail(nextDetail);

  const addedTags = next.tags.filter((tag) => !prev.tags.includes(tag));
  const removedTags = prev.tags.filter((tag) => !next.tags.includes(tag));

  const terminalsAdded = next.terminals.filter((v) => !prev.terminals.includes(v));
  const terminalsRemoved = prev.terminals.filter((v) => !next.terminals.includes(v));

  const resumeTimesAdded = next.resumeTimes.filter((v) => !prev.resumeTimes.includes(v));
  const resumeTimesRemoved = prev.resumeTimes.filter((v) => !next.resumeTimes.includes(v));

  return {
    prev,
    next,
    changed: prev.text !== next.text,
    addedTags,
    removedTags,
    terminalsAdded,
    terminalsRemoved,
    resumeTimesAdded,
    resumeTimesRemoved
  };
}
3) src/lib/noiseGate.js 신규 파일
import { EVENT_NOISE_WINDOW_MS } from "./constants.js";

function normalizeNoiseText(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export function eventNoiseKey(ev = {}) {
  if (ev.noiseKey) return String(ev.noiseKey);
  return [
    ev.category || "",
    ev.title || "",
    normalizeNoiseText(ev.detail || "")
  ].join("|");
}

function tsMs(ts) {
  const n = Date.parse(ts || "");
  return Number.isFinite(n) ? n : Date.now();
}

export function isSuppressed(prevTimeline = [], ev, windowMs = EVENT_NOISE_WINDOW_MS) {
  const key = eventNoiseKey(ev);
  const t = tsMs(ev?.ts);

  return prevTimeline.some((old) => {
    const same = eventNoiseKey(old) === key;
    const dt = Math.abs(tsMs(old?.ts) - t);
    return same && dt <= windowMs;
  });
}

export function mergeTimelineWithNoiseGate(
  prevTimeline = [],
  incomingEvents = [],
  { windowMs = EVENT_NOISE_WINDOW_MS, maxItems = 220 } = {}
) {
  const accepted = [];

  for (const ev of incomingEvents) {
    const against = [...accepted, ...prevTimeline];
    if (!isSuppressed(against, ev, windowMs)) {
      accepted.push(ev);
    }
  }

  return [...accepted, ...prevTimeline].slice(0, maxItems);
}
4) src/lib/routeApi.js 신규 파일

OSRM 우선, Mapbox 대체. 코드가 geometries=geojson&overview=full을 쓰는 이유는 route line을 바로 Polyline에 넣기 위해서입니다. OSRM/Mapbox 모두 그 형식을 지원합니다. Mapbox는 driving-traffic 프로필과 최대 25개 좌표를 지원합니다.

const routeCache = new Map();

function round6(n) {
  return Number(n).toFixed(6);
}

function serializeWaypoints(waypoints = []) {
  return waypoints.map((w) => `${round6(w.lng)},${round6(w.lat)}`).join(";");
}

function ensureWaypoints(waypoints = []) {
  return waypoints
    .map((w) => ({
      lat: Number(w?.lat),
      lng: Number(w?.lng),
      label: String(w?.label || "")
    }))
    .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));
}

function coordsToLeafletLatLngs(coords = []) {
  return coords
    .map((pair) => {
      const lng = Number(pair?.[0]);
      const lat = Number(pair?.[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    })
    .filter(Boolean);
}

export function resolveRouteWaypoints(routeId, routeGeo) {
  const def = routeGeo?.routes?.[routeId];
  if (!def) return [];

  if (Array.isArray(def.coords) && def.coords.length >= 2) {
    return def.coords
      .map((c) => {
        if (Array.isArray(c)) {
          const lat = Number(c[0]);
          const lng = Number(c[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return { lat, lng, label: "" };
        }
        const lat = Number(c?.lat);
        const lng = Number(c?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, label: String(c?.label || "") };
      })
      .filter(Boolean);
  }

  const nodeIds = Array.isArray(def.waypoints) ? def.waypoints : [];
  return nodeIds
    .map((id) => {
      const node = routeGeo?.nodes?.[id];
      if (!node) return null;
      const lat = Number(node?.lat);
      const lng = Number(node?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, label: String(node?.label || id), id };
    })
    .filter(Boolean);
}

async function fetchOsrmRoute({ waypoints, profile = "driving", signal }) {
  const safeWaypoints = ensureWaypoints(waypoints);
  if (safeWaypoints.length < 2) {
    throw new Error("At least 2 waypoints required");
  }

  const base = (import.meta.env.VITE_OSRM_BASE_URL || "https://router.project-osrm.org").replace(/\/+$/, "");
  const coords = serializeWaypoints(safeWaypoints);
  const routeProfile = profile === "driving-traffic" ? "driving" : profile;
  const url = `${base}/route/v1/${routeProfile}/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);

  const json = await res.json();
  const route = json?.routes?.[0];
  const geometry = route?.geometry?.coordinates;

  if (json?.code !== "Ok" || !Array.isArray(geometry)) {
    throw new Error(json?.code || "OSRM NoRoute");
  }

  return {
    provider: "osrm",
    profile: routeProfile,
    latlngs: coordsToLeafletLatLngs(geometry),
    distanceM: Number.isFinite(route?.distance) ? route.distance : null,
    durationS: Number.isFinite(route?.duration) ? route.duration : null,
    raw: json
  };
}

async function fetchMapboxRoute({ waypoints, profile = "mapbox/driving-traffic", signal }) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing VITE_MAPBOX_TOKEN");

  const safeWaypoints = ensureWaypoints(waypoints);
  if (safeWaypoints.length < 2) {
    throw new Error("At least 2 waypoints required");
  }

  const coords = serializeWaypoints(safeWaypoints);
  const routeProfile = profile.startsWith("mapbox/") ? profile : `mapbox/${profile}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/${routeProfile}/${coords}`);

  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("access_token", token);

  // traffic-aware profile면 segment annotation도 받을 수 있음
  if (routeProfile === "mapbox/driving-traffic") {
    url.searchParams.set("annotations", "distance,duration,congestion_numeric");
  }

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);

  const json = await res.json();
  const route = json?.routes?.[0];
  const geometry = route?.geometry?.coordinates;

  if (!Array.isArray(geometry)) {
    throw new Error(json?.message || "Mapbox NoRoute");
  }

  return {
    provider: "mapbox",
    profile: routeProfile,
    latlngs: coordsToLeafletLatLngs(geometry),
    distanceM: Number.isFinite(route?.distance) ? route.distance : null,
    durationS: Number.isFinite(route?.duration) ? route.duration : null,
    raw: json
  };
}

export async function fetchRouteGeometry({ waypoints, provider = "osrm", profile, signal }) {
  if (provider === "mapbox") {
    return fetchMapboxRoute({ waypoints, profile: profile || "mapbox/driving-traffic", signal });
  }
  return fetchOsrmRoute({ waypoints, profile: profile || "driving", signal });
}

export async function fetchRouteGeometryCached(args) {
  const waypoints = ensureWaypoints(args?.waypoints || []);
  const provider = args?.provider || "osrm";
  const profile = args?.profile || (provider === "mapbox" ? "mapbox/driving-traffic" : "driving");
  const key = `${provider}|${profile}|${serializeWaypoints(waypoints)}`;

  if (routeCache.has(key)) {
    return routeCache.get(key);
  }

  const promise = fetchRouteGeometry({ ...args, waypoints, provider, profile });
  routeCache.set(key, promise);

  try {
    const result = await promise;
    routeCache.set(key, Promise.resolve(result));
    return result;
  } catch (err) {
    routeCache.delete(key);
    throw err;
  }
}
5) src/lib/routeGeoDefault.js 신규 파일

API payload에 route_geo가 아직 안 들어오는 동안의 fallback입니다.

export const DEFAULT_ROUTE_GEO = {
  nodes: {
    ABU:   { label: "Abu Dhabi",        lat: 24.4539, lng: 54.3773 },
    ALAIN: { label: "Al Ain",           lat: 24.2075, lng: 55.7447 },
    MEZY:  { label: "Mezyad",           lat: 24.0540, lng: 55.7780 },
    FUJ:   { label: "Fujairah",         lat: 25.1288, lng: 56.3265 },
    BURA:  { label: "Buraimi",          lat: 24.2500, lng: 55.7933 },
    SOHAR: { label: "Sohar",            lat: 24.3470, lng: 56.7090 },
    NIZWA: { label: "Nizwa",            lat: 22.9333, lng: 57.5333 },
    KHATM: { label: "Khatmat Malaha",   lat: 25.9950, lng: 56.3470 },
    MUSC:  { label: "Muscat",           lat: 23.5880, lng: 58.3829 },
    GHUW:  { label: "Ghuwaifat",        lat: 23.5500, lng: 53.8000 },
    RIY:   { label: "Riyadh",           lat: 24.7136, lng: 46.6753 }
  },
  routes: {
    A: { waypoints: ["ABU", "ALAIN", "BURA", "SOHAR"], provider: "osrm",   profile: "driving" },
    B: { waypoints: ["ABU", "MEZY", "NIZWA"],          provider: "osrm",   profile: "driving" },
    C: { waypoints: ["ABU", "GHUW", "RIY"],            provider: "mapbox", profile: "mapbox/driving" },
    D: { waypoints: ["ABU", "FUJ", "KHATM", "MUSC"],   provider: "osrm",   profile: "driving" }
  }
};
6) src/components/RouteMapLeaflet.jsx 전체 교체

현재 SVG schematic RouteMap를 이걸로 교체하세요. 현재 preview.html의 RouteMap은 x/y 좌표를 쓰는 SVG입니다.

import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";

import { DEFAULT_ROUTE_GEO } from "../lib/routeGeoDefault.js";
import { fetchRouteGeometryCached, resolveRouteWaypoints } from "../lib/routeApi.js";
import { ROUTE_BUFFER_FACTOR } from "../lib/constants.js";

function FitBounds({ latlngs = [] }) {
  const map = useMap();

  useEffect(() => {
    if (!latlngs.length) return;
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, latlngs]);

  return null;
}

function flattenLatLngs(routeGeo, resolvedLines) {
  const all = [];

  Object.values(routeGeo?.nodes || {}).forEach((n) => {
    if (Number.isFinite(n?.lat) && Number.isFinite(n?.lng)) {
      all.push([n.lat, n.lng]);
    }
  });

  Object.values(resolvedLines || {}).forEach((line) => {
    (line?.latlngs || []).forEach((p) => {
      if (Array.isArray(p) && p.length === 2) all.push(p);
    });
  });

  return all;
}

export default function RouteMapLeaflet({
  routes = [],
  routeGeo = null,
  selectedId = null,
  onSelect = () => {}
}) {
  const geo = routeGeo || DEFAULT_ROUTE_GEO;
  const byId = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const [resolvedLines, setResolvedLines] = useState({});

  const tileUrl =
    import.meta.env.VITE_LEAFLET_TILES_URL ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttr =
    import.meta.env.VITE_LEAFLET_TILES_ATTRIBUTION ||
    "&copy; OpenStreetMap contributors";

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function run() {
      const entries = await Promise.all(
        routes.map(async (r) => {
          const def = geo?.routes?.[r.id] || {};
          const waypoints = resolveRouteWaypoints(r.id, geo);

          if (waypoints.length < 2) {
            return [r.id, null];
          }

          const provider =
            def.provider ||
            (import.meta.env.VITE_MAPBOX_TOKEN ? "mapbox" : "osrm");

          const profile =
            def.profile ||
            (provider === "mapbox" ? "mapbox/driving-traffic" : "driving");

          try {
            const route = await fetchRouteGeometryCached({
              waypoints,
              provider,
              profile,
              signal: controller.signal
            });

            return [
              r.id,
              {
                ...route,
                waypoints,
                isFallback: false
              }
            ];
          } catch (err) {
            return [
              r.id,
              {
                provider: "fallback",
                profile: "straight",
                isFallback: true,
                waypoints,
                latlngs: waypoints.map((w) => [w.lat, w.lng]),
                distanceM: null,
                durationS: null,
                error: String(err?.message || err || "route fetch failed")
              }
            ];
          }
        })
      );

      if (!alive) return;
      setResolvedLines(
        Object.fromEntries(entries.filter(([, value]) => Boolean(value)))
      );
    }

    run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [routes, geo]);

  const colorFor = (status) => {
    if (status === "BLOCKED") return "#ef4444";
    if (status === "CAUTION") return "#f59e0b";
    return "#22c55e";
  };

  const allLatLngs = useMemo(
    () => flattenLatLngs(geo, resolvedLines),
    [geo, resolvedLines]
  );

  const center = geo?.nodes?.ABU
    ? [geo.nodes.ABU.lat, geo.nodes.ABU.lng]
    : [24.4539, 54.3773];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900 }}>🗺️ Route Map (actual roads)</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
            OSRM 우선, Mapbox 대체. 실패하면 waypoint straight-line fallback.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 900 }}>● OPEN</span>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 900 }}>● CAUTION</span>
          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 900 }}>● BLOCKED</span>
        </div>
      </div>

      <div style={{ height: 360, borderRadius: 14, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={center} zoom={7} scrollWheelZoom style={{ width: "100%", height: "100%" }}>
          <TileLayer url={tileUrl} attribution={tileAttr} />
          <FitBounds latlngs={allLatLngs} />

          {Object.entries(resolvedLines).map(([rid, line]) => {
            const route = byId.get(rid) || { status: "OPEN", base_h: 0, cong: 0 };
            const isSel = selectedId === rid;
            const eff = route.base_h * (1 + route.cong) * ROUTE_BUFFER_FACTOR;

            return (
              <Polyline
                key={rid}
                positions={line.latlngs}
                pathOptions={{
                  color: colorFor(route.status),
                  weight: isSel ? 7 : 5,
                  opacity: route.status === "BLOCKED" ? 0.65 : 0.95,
                  dashArray: route.status === "CAUTION" ? "10 8" : undefined
                }}
                eventHandlers={{
                  click: () => onSelect(rid)
                }}
              >
                <Tooltip sticky direction="top">
                  <div style={{ fontSize: 12, fontWeight: 900 }}>
                    Route {rid} <span style={{ color: colorFor(route.status) }}>{route.status}</span>
                  </div>
                  <div style={{ fontSize: 11 }}>
                    effective ~{eff.toFixed(1)}h (buffer x{ROUTE_BUFFER_FACTOR})
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    source: {line.isFallback ? "fallback" : `${line.provider}/${line.profile}`}
                  </div>
                  {line.error && (
                    <div style={{ fontSize: 10, color: "#fca5a5", marginTop: 4 }}>
                      {line.error}
                    </div>
                  )}
                </Tooltip>
              </Polyline>
            );
          })}

          {Object.entries(geo?.nodes || {}).map(([nodeId, node]) => (
            <CircleMarker
              key={nodeId}
              center={[node.lat, node.lng]}
              radius={5}
              pathOptions={{ color: "#94a3b8", fillColor: "#94a3b8", fillOpacity: 0.9 }}
            >
              <Tooltip direction="top">
                <div style={{ fontSize: 12, fontWeight: 900 }}>{node.label || nodeId}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
                  {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
7) src/lib/deriveState.js 패치

preview.html 기준 현재 deriveState는 airspaceState까지만 만들고 세부 구간은 없습니다.

import { I02_SEGMENTS } from "./constants.js";

export function getI02Segment(state) {
  const s = Math.max(0, Math.min(1, Number(state) || 0));
  return I02_SEGMENTS.find((row) => s >= row.min && s < row.max) || I02_SEGMENTS[I02_SEGMENTS.length - 1];
}

그리고 deriveState() 안에서 i02 처리부를 아래로 교체:

const i02State = Number(i02?.state) || 0;
const airspaceState = i02State >= 0.8 ? "CLOSED" : i02State >= 0.5 ? "DISRUPTED" : "OPEN";
const airspaceHint = String(i02?.detail || "").slice(0, 48);

const i02Seg = getI02Segment(i02State);

마지막 return에 아래 2개를 추가:

airspaceSegment: i02Seg.id,
airspaceSegmentSeverity: i02Seg.severity,
8) src/lib/timelineRules.js에서 mkEvent와 buildDiffEvents 교체

현재 preview.html의 buildDiffEvents는 MODE/GATE/AIRSPACE/EVIDENCE/route status·congestion/intel만 보고 있습니다.
아래 교체본은 TIER0 floor 변화, I02 detail 분류 변화, resume time/terminal 변화, route effective time spike까지 잡습니다.

import {
  EVIDENCE_FLOOR_T0_TARGET,
  ROUTE_BUFFER_FACTOR,
  ROUTE_CONGESTION_DELTA,
  ROUTE_EFF_SPIKE_HOURS,
  ROUTE_EFF_SPIKE_RATIO
} from "./constants.js";
import { diffI02Detail } from "./i02DetailRules.js";

export function mkEvent({
  level = "INFO",
  category = "SYSTEM",
  title = "",
  detail = "",
  ts = null,
  noiseKey = ""
}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: ts || new Date().toISOString(),
    level,
    category,
    title,
    detail,
    noiseKey
  };
}

function routeEffHours(route) {
  const base = Number(route?.base_h || 0);
  const cong = Number(route?.cong || 0);
  if (!Number.isFinite(base) || base <= 0) return null;
  return base * (1 + Math.max(0, cong)) * ROUTE_BUFFER_FACTOR;
}

function severityForAirspaceSeg(segId = "") {
  if (segId === "CLOSED" || segId === "SEVERE") return "ALERT";
  if (segId === "DISRUPTED" || segId === "DELAYED") return "WARN";
  return "INFO";
}

export function buildDiffEvents(prevDash, nextDash, prevDerived, nextDerived) {
  const events = [];
  const ts = new Date().toISOString();

  if (!prevDash || !prevDerived) {
    events.push(
      mkEvent({
        level: "INFO",
        category: "SYSTEM",
        title: "Dashboard loaded",
        detail: `source=${nextDash?.metadata?.source || "local"}`,
        ts,
        noiseKey: "SYSTEM|DASHBOARD_LOADED"
      })
    );
    return events;
  }

  if (prevDerived.modeState !== nextDerived.modeState) {
    events.push(
      mkEvent({
        level:
          nextDerived.modeState === "DEGRADED"
            ? "ALERT"
            : nextDerived.modeState === "RED_PREP"
              ? "WARN"
              : "INFO",
        category: "MODE",
        title: `MODE 변경: ${prevDerived.modeState} → ${nextDerived.modeState}`,
        detail: `Δ=${nextDerived.ds.toFixed(3)} / Conf=${nextDerived.ec.toFixed(3)} / Gate=${nextDerived.gateState}`,
        ts,
        noiseKey: `MODE|${prevDerived.modeState}|${nextDerived.modeState}`
      })
    );
  }

  if (prevDerived.gateState !== nextDerived.gateState) {
    events.push(
      mkEvent({
        level:
          nextDerived.gateState === "BLOCKED"
            ? "ALERT"
            : nextDerived.gateState === "CAUTION"
              ? "WARN"
              : "INFO",
        category: "GATE",
        title: `Gate 변경: ${prevDerived.gateState} → ${nextDerived.gateState}`,
        detail: `active=${nextDerived.gateActiveCount}/3 (Stay=${nextDerived.gateStay ? "Y" : "N"}, Strike=${nextDerived.gateStrike ? "Y" : "N"}, Road=${nextDerived.gateRoad ? "Y" : "N"})`,
        ts,
        noiseKey: `GATE|${prevDerived.gateState}|${nextDerived.gateState}`
      })
    );
  }

  if (prevDerived.evidenceState !== nextDerived.evidenceState) {
    events.push(
      mkEvent({
        level: nextDerived.evidenceState === "PASSED" ? "INFO" : "WARN",
        category: "EVIDENCE",
        title: `Evidence 상태: ${prevDerived.evidenceState} → ${nextDerived.evidenceState}`,
        detail: `Conf=${nextDerived.ec.toFixed(3)} vs Thr=${nextDerived.effectiveThreshold.toFixed(3)}`,
        ts,
        noiseKey: `EVIDENCE|STATE|${nextDerived.evidenceState}`
      })
    );
  }

  // TIER0 Evidence floor
  const prevFloor = Number(prevDerived.evidenceFloorT0 ?? 0);
  const nextFloor = Number(nextDerived.evidenceFloorT0 ?? 0);
  const prevPassed = prevFloor >= EVIDENCE_FLOOR_T0_TARGET;
  const nextPassed = nextFloor >= EVIDENCE_FLOOR_T0_TARGET;

  if (prevPassed !== nextPassed) {
    events.push(
      mkEvent({
        level: nextPassed ? "INFO" : "WARN",
        category: "EVIDENCE",
        title: nextPassed ? "Evidence Floor PASSED" : "Evidence Floor FAILED",
        detail: `TIER0 cv count ${prevFloor} → ${nextFloor} (target=${EVIDENCE_FLOOR_T0_TARGET})`,
        ts,
        noiseKey: `EVIDENCE|FLOOR|PASSED=${nextPassed}`
      })
    );
  } else if (prevFloor !== nextFloor) {
    events.push(
      mkEvent({
        level: nextFloor < EVIDENCE_FLOOR_T0_TARGET ? "WARN" : "INFO",
        category: "EVIDENCE",
        title: `TIER0 Evidence floor 변경`,
        detail: `cv count ${prevFloor} → ${nextFloor} (target=${EVIDENCE_FLOOR_T0_TARGET})`,
        ts,
        noiseKey: `EVIDENCE|FLOOR_COUNT|${nextFloor}`
      })
    );
  }

  // I02 segment
  if (prevDerived.airspaceSegment !== nextDerived.airspaceSegment) {
    events.push(
      mkEvent({
        level: severityForAirspaceSeg(nextDerived.airspaceSegment),
        category: "AIRSPACE",
        title: `I02 세부 구간: ${prevDerived.airspaceSegment} → ${nextDerived.airspaceSegment}`,
        detail: `I02 state ${(Number(prevDerived.i02?.state) || 0).toFixed(2)} → ${(Number(nextDerived.i02?.state) || 0).toFixed(2)} / hint="${nextDerived.airspaceHint || ""}"`,
        ts,
        noiseKey: `AIRSPACE|SEGMENT|${nextDerived.airspaceSegment}`
      })
    );
  }

  // I02 detail parser diff
  const i02Diff = diffI02Detail(prevDerived?.i02?.detail || "", nextDerived?.i02?.detail || "");
  if (i02Diff.changed) {
    if (i02Diff.addedTags.length || i02Diff.removedTags.length) {
      events.push(
        mkEvent({
          level: "WARN",
          category: "AIRSPACE",
          title: "I02 detail 분류 업데이트",
          detail: [
            i02Diff.addedTags.length ? `added: ${i02Diff.addedTags.join(", ")}` : "",
            i02Diff.removedTags.length ? `removed: ${i02Diff.removedTags.join(", ")}` : ""
          ].filter(Boolean).join("\n"),
          ts,
          noiseKey: `AIRSPACE|I02_TAGS|${i02Diff.addedTags.sort().join(",")}|${i02Diff.removedTags.sort().join(",")}`
        })
      );
    }

    if (i02Diff.terminalsAdded.length || i02Diff.terminalsRemoved.length) {
      events.push(
        mkEvent({
          level: "WARN",
          category: "AIRSPACE",
          title: "I02 터미널 범위 변경",
          detail: [
            i02Diff.terminalsAdded.length ? `added: ${i02Diff.terminalsAdded.join(", ")}` : "",
            i02Diff.terminalsRemoved.length ? `removed: ${i02Diff.terminalsRemoved.join(", ")}` : ""
          ].filter(Boolean).join("\n"),
          ts,
          noiseKey: `AIRSPACE|I02_TERMINALS|${i02Diff.terminalsAdded.sort().join(",")}|${i02Diff.terminalsRemoved.sort().join(",")}`
        })
      );
    }

    if (i02Diff.resumeTimesAdded.length || i02Diff.resumeTimesRemoved.length) {
      events.push(
        mkEvent({
          level: "INFO",
          category: "AIRSPACE",
          title: "I02 재개 시각 업데이트",
          detail: [
            i02Diff.resumeTimesAdded.length ? `added: ${i02Diff.resumeTimesAdded.join(", ")}` : "",
            i02Diff.resumeTimesRemoved.length ? `removed: ${i02Diff.resumeTimesRemoved.join(", ")}` : ""
          ].filter(Boolean).join("\n"),
          ts,
          noiseKey: `AIRSPACE|I02_RESUME|${i02Diff.resumeTimesAdded.sort().join(",")}|${i02Diff.resumeTimesRemoved.sort().join(",")}`
        })
      );
    }
  }

  // Route status / congestion / effective spike
  const prevRoutes = new Map((prevDash.routes || []).map((r) => [r.id, r]));
  for (const r of (nextDash.routes || [])) {
    const p = prevRoutes.get(r.id);
    if (!p) continue;

    if (p.status !== r.status) {
      events.push(
        mkEvent({
          level: r.status === "BLOCKED" ? "ALERT" : r.status === "CAUTION" ? "WARN" : "INFO",
          category: "ROUTE",
          title: `Route ${r.id} 상태: ${p.status} → ${r.status}`,
          detail: r.note || "",
          ts,
          noiseKey: `ROUTE|STATUS|${r.id}|${r.status}`
        })
      );
    } else {
      const dc = Math.abs((Number(p.cong) || 0) - (Number(r.cong) || 0));
      if (dc >= ROUTE_CONGESTION_DELTA) {
        events.push(
          mkEvent({
            level: "WARN",
            category: "ROUTE",
            title: `Route ${r.id} 혼잡도 변화`,
            detail: `cong ${(Number(p.cong) || 0).toFixed(2)} → ${(Number(r.cong) || 0).toFixed(2)}`,
            ts,
            noiseKey: `ROUTE|CONG|${r.id}`
          })
        );
      }
    }

    const prevEff = routeEffHours(p);
    const nextEff = routeEffHours(r);
    if (Number.isFinite(prevEff) && Number.isFinite(nextEff) && nextEff > prevEff) {
      const abs = nextEff - prevEff;
      const ratio = prevEff > 0 ? (nextEff / prevEff - 1) : 0;

      if (abs >= ROUTE_EFF_SPIKE_HOURS && ratio >= ROUTE_EFF_SPIKE_RATIO) {
        events.push(
          mkEvent({
            level: "WARN",
            category: "ROUTE",
            title: `Route ${r.id} effective time 급증`,
            detail:
              `eff ${prevEff.toFixed(1)}h → ${nextEff.toFixed(1)}h (Δ${abs.toFixed(1)}h, +${Math.round(ratio * 100)}%)\n` +
              `base ${(Number(p.base_h) || 0).toFixed(1)}→${(Number(r.base_h) || 0).toFixed(1)} / cong ${(Number(p.cong) || 0).toFixed(2)}→${(Number(r.cong) || 0).toFixed(2)}`,
            ts,
            noiseKey: `ROUTE|EFF_SPIKE|${r.id}`
          })
        );
      }
    }
  }

  if (prevDerived.leadingHypothesis?.id !== nextDerived.leadingHypothesis?.id) {
    events.push(
      mkEvent({
        level: "INFO",
        category: "HYPOTHESIS",
        title: `Leading 변경: ${prevDerived.leadingHypothesis?.id || "?"} → ${nextDerived.leadingHypothesis?.id || "?"}`,
        detail: `${nextDerived.leadingHypothesis?.name || ""}`,
        ts,
        noiseKey: `HYPOTHESIS|LEAD|${nextDerived.leadingHypothesis?.id || "?"}`
      })
    );
  }

  if (Number(prevDerived.ds || 0) < 0.20 && Number(nextDerived.ds || 0) >= 0.20) {
    events.push(
      mkEvent({
        level: "ALERT",
        category: "MODE",
        title: "ΔScore 임계 돌파",
        detail: `ΔScore ${Number(nextDerived.ds || 0).toFixed(3)} ≥ 0.20`,
        ts,
        noiseKey: "MODE|DELTA_SCORE_THRESHOLD"
      })
    );
  }

  const prevTop = (prevDash.intelFeed || [])[0];
  const nextTop = (nextDash.intelFeed || [])[0];
  const prevKey = prevTop ? String(prevTop.tsIso || prevTop.ts || prevTop.text || "") : "";
  const nextKey = nextTop ? String(nextTop.tsIso || nextTop.ts || nextTop.text || "") : "";

  if (prevKey && nextKey && prevKey !== nextKey) {
    events.push(
      mkEvent({
        level: nextTop.priority === "CRITICAL" ? "ALERT" : nextTop.priority === "HIGH" ? "WARN" : "INFO",
        category: "INTEL",
        title: `새 Intel: ${nextTop.priority}`,
        detail: nextTop.text || "",
        ts,
        noiseKey: `INTEL|TOP|${nextKey}`
      })
    );
  }

  return events;
}
9) src/lib/normalize.js 패치

현재 normalizer는 routeGeo를 전혀 들고 오지 않습니다.

function normalizeRouteGeo(raw = null) {
  if (!raw || typeof raw !== "object") return null;

  const nodes = Object.fromEntries(
    Object.entries(raw.nodes || {})
      .map(([id, node]) => {
        const lat = Number(node?.lat ?? node?.latlng?.[0]);
        const lng = Number(node?.lng ?? node?.latlng?.[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [
          id,
          {
            label: String(node?.label || id),
            lat,
            lng
          }
        ];
      })
      .filter(Boolean)
  );

  const routes = Object.fromEntries(
    Object.entries(raw.routes || {}).map(([rid, route]) => [
      rid,
      {
        waypoints: Array.isArray(route?.waypoints) ? route.waypoints.filter((id) => nodes[id]) : [],
        coords: Array.isArray(route?.coords) ? route.coords : [],
        provider: String(route?.provider || "osrm"),
        profile: String(route?.profile || "driving")
      }
    ])
  );

  return { nodes, routes };
}

normalizeDashboard() return에 추가:

routeGeo: normalizeRouteGeo(payload.routeGeo || payload.route_geo || null),

snapshotToDashboard() return에 추가:

routeGeo: normalizeRouteGeo(snapshot.route_geo || snapshot.routeGeo || null),
10) src/App.jsx 패치

현재는 logEvent()와 diff event insertion이 noise gate 없이 timeline에 바로 들어갑니다.

상단 import 추가:

import { mergeTimelineWithNoiseGate } from "./lib/noiseGate.js";

logEvent 교체:

const logEvent = useCallback((ev) => {
  setTimeline((prev) =>
    mergeTimelineWithNoiseGate(prev, [mkEvent(ev)], { maxItems: TIMELINE_MAX })
  );
}, []);

applyDashboard() 안의 diff event 삽입 교체:

if (diff.length) {
  setTimeline((prev) =>
    mergeTimelineWithNoiseGate(prev, diff, { maxItems: TIMELINE_MAX })
  );
}

RouteMapLeaflet prop 추가:

<RouteMapLeaflet
  routes={dash.routes}
  routeGeo={dash.routeGeo}
  selectedId={selectedRouteId}
  onSelect={(rid) => setSelectedRouteId((prev) => (prev === rid ? null : rid))}
/>
11) 백엔드: route_geo를 state payload에 싣기

export_hyie_live.py는 payload를 읽어서 그대로 hyie_state.json으로 써 주기 때문에, 실제로 바꿔야 하는 곳은 payload를 생성하는 쪽입니다. update_hyie_state_now.py는 _update_hyie_state()가 돌려준 payload 일부만 출력할 뿐이라 extra field를 제거하지 않습니다.

src/iran_monitor/route_geo.py 신규 파일
from __future__ import annotations

import copy

ROUTE_GEO = {
    "nodes": {
        "ABU":   {"label": "Abu Dhabi",      "lat": 24.4539, "lng": 54.3773},
        "ALAIN": {"label": "Al Ain",         "lat": 24.2075, "lng": 55.7447},
        "MEZY":  {"label": "Mezyad",         "lat": 24.0540, "lng": 55.7780},
        "FUJ":   {"label": "Fujairah",       "lat": 25.1288, "lng": 56.3265},
        "BURA":  {"label": "Buraimi",        "lat": 24.2500, "lng": 55.7933},
        "SOHAR": {"label": "Sohar",          "lat": 24.3470, "lng": 56.7090},
        "NIZWA": {"label": "Nizwa",          "lat": 22.9333, "lng": 57.5333},
        "KHATM": {"label": "Khatmat Malaha", "lat": 25.9950, "lng": 56.3470},
        "MUSC":  {"label": "Muscat",         "lat": 23.5880, "lng": 58.3829},
        "GHUW":  {"label": "Ghuwaifat",      "lat": 23.5500, "lng": 53.8000},
        "RIY":   {"label": "Riyadh",         "lat": 24.7136, "lng": 46.6753},
    },
    "routes": {
        "A": {"waypoints": ["ABU", "ALAIN", "BURA", "SOHAR"], "provider": "osrm",   "profile": "driving"},
        "B": {"waypoints": ["ABU", "MEZY", "NIZWA"],          "provider": "osrm",   "profile": "driving"},
        "C": {"waypoints": ["ABU", "GHUW", "RIY"],            "provider": "mapbox", "profile": "mapbox/driving"},
        "D": {"waypoints": ["ABU", "FUJ", "KHATM", "MUSC"],   "provider": "osrm",   "profile": "driving"},
    },
}

def build_route_geo_payload() -> dict:
    return copy.deepcopy(ROUTE_GEO)

그리고 실제 payload를 조립하는 함수 (src.iran_monitor.app._update_hyie_state)에서:

from src.iran_monitor.route_geo import build_route_geo_payload

payload 생성 직후 한 줄 추가:

payload["route_geo"] = build_route_geo_payload()

이렇게 하면 live payload 예시는 다음처럼 됩니다:

{
  "state_ts": "2026-03-05T10:20:00+04:00",
  "status": "ok",
  "source_health": {},
  "degraded": false,
  "intel_feed": [],
  "indicators": [],
  "hypotheses": [],
  "routes": [],
  "checklist": [],
  "conflict_stats": {},
  "route_geo": {
    "nodes": {
      "ABU": { "label": "Abu Dhabi", "lat": 24.4539, "lng": 54.3773 }
    },
    "routes": {
      "A": {
        "waypoints": ["ABU", "ALAIN", "BURA", "SOHAR"],
        "provider": "osrm",
        "profile": "driving"
      }
    }
  }
}
12) 적용 순서

constants.js 확장

i02DetailRules.js, noiseGate.js, routeApi.js, routeGeoDefault.js 추가

RouteMapLeaflet.jsx 교체

deriveState.js에 airspaceSegment 추가

timelineRules.js의 mkEvent, buildDiffEvents 교체

normalize.js에 routeGeo 통과 로직 추가

App.jsx에서 timeline merge를 noise gate로 교체하고 routeGeo prop 전달

백엔드 payload builder에 route_geo 추가

13) 운영 팁

OSRM만 써도 실도로 선은 충분히 좋아집니다.

Mapbox token이 있으면 Route C 같이 긴 구간이나 traffic-aware profile이 필요한 경우 mapbox/driving-traffic로 바꾸면 됩니다. Mapbox는 traffic-aware route와 route annotations를 지원합니다.

React-Leaflet 쪽은 Polyline에 eventHandlers, pathOptions를 쓰는 현재 패턴이 정석이라 하이라이트/선택 UX는 그대로 유지됩니다.
