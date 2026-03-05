항 상태(I02) 세부 구간 변화, Route effective time 급증) 잡기
    (B) React 컴포넌트 / 프로젝트로 분리
Thought for 44m 25s

좋아요 ✔️ 아래처럼(1) Route map → 실제 지도(Leaflet) + 좌표 기반, (2) Timeline 규칙 정교화, ** (3) React 프로젝트 / 컴포넌트 분리(Vite) ** 까지 한 번에 갈 수 있게 “바로 실행 가능한” 프로젝트 스캐폴딩 코드를 드릴게요.
(Leaflet 기본: OSM 타일 / Mapbox는.env만 바꾸면 타일 소스 교체 가능)

0) 결과물 핵심(요약)

🗺️ Route Map = Leaflet 실제 지도

노드(도시 / 보더 포인트) = lat / lng

Route = 노드 시퀀스 → Polyline

Route 클릭 → 선택 / 하이라이트 + 카드 연동

🕒 Timeline 규칙 “세밀화”

TIER0 Evidence floor(교차검증 개수) 변화 / 통과 - 실패 전환 이벤트

I02(공항 / 영공) 5단계 세부 구간(NORMAL / DELAYED / DISRUPTED / SEVERE / CLOSED) 변화 이벤트

I02 detail 문구 변경 이벤트

Route effective time 급증(버퍼 포함) 감지 이벤트

🧩 React 프로젝트 분리

RouteMapLeaflet, TimelinePanel, Simulator, charts, normalize / derive / timelineRules로 분리

1) 프로젝트 구조
urgentdash - react /
    package.json
vite.config.js
index.html
src /
    main.jsx
styles.css
App.jsx
data /
    fallbackDashboard.js
lib /
    constants.js
utils.js
normalize.js
deriveState.js
timelineRules.js
summary.js
routeGeo.js
components /
    ui.js
charts.js
RouteMapLeaflet.jsx
TimelinePanel.jsx
Simulator.jsx
2) 코드(그대로 복붙해서 프로젝트 생성)
package.json
{
    "name": "urgentdash-react",
        "private": true,
            "version": "0.1.0",
                "type": "module",
                    "scripts": {
        "dev": "vite",
            "build": "vite build",
                "preview": "vite preview"
    },
    "dependencies": {
        "leaflet": "^1.9.4",
            "react": "^18.2.0",
                "react-dom": "^18.2.0",
                    "react-leaflet": "^4.2.1"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.2.1",
            "vite": "^5.2.0"
    }
}
vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true
    }
});
index.html
    < !doctype html >
        <html lang="ko">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>UrgentDash</title>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="/src/main.jsx"></script>
            </body>
        </html>
src / main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    // StrictMode를 쓰면 dev에서 useEffect 2번 실행될 수 있어요.
    // App 내부에서 guard(ref)로 방지해둠.
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
src / styles.css
:root {
    color - scheme: dark;
}

html, body {
    height: 100 %;
}

body {
    margin: 0;
    background: #020617;
    color: #e2e8f0;
    font - family: Inter, system - ui, -apple - system, Segoe UI, Roboto, Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans - serif;
}

* { box- sizing: border - box; }

a { color: #93c5fd; }

button, input, select, textarea {
    font - family: inherit;
}

.leaflet - control - attribution {
    background: rgba(2, 6, 23, 0.7)!important;
    color: #94a3b8!important;
    border - radius: 8px!important;
    padding: 2px 8px!important;
    border: 1px solid #1e293b!important;
}
.leaflet - control - attribution a {
    color: #93c5fd!important;
}
3) lib(핵심 로직)
src / lib / constants.js
export const GST_TIMEZONE = "Asia/Dubai";

export const STORAGE_KEYS = {
    egress: "urgentdash.egressLossETA",
    history: "urgentdash.history.v1",
    timeline: "urgentdash.timeline.v1",
    autoSummary: "urgentdash.autoSummary.v1"
};

export const HISTORY_MAX_POINTS = 96; // ~24h @ 15min
export const TIMELINE_MAX = 220;

export const POLL_INTERVAL_MS = 15 * 60 * 1000;
export const COUNTDOWN_SECONDS = 15 * 60;

export const MIN_EVIDENCE_SOURCES = 2;
export const FALLBACK_EGRESS_LOSS_ETA = 2;

export const ROUTE_BUFFER_FACTOR = 2.0;

// Evidence floor (TIER0 cv count)
export const EVIDENCE_FLOOR_T0_TARGET = 3;

// Timeline thresholds
export const ROUTE_CONGESTION_DELTA = 0.15;
export const ROUTE_EFF_SPIKE_RATIO = 0.25;  // +25%
export const ROUTE_EFF_SPIKE_HOURS = 1.5;   // +1.5h

// I02 detailed segments (요청하신 “세부 구간”)
export const I02_SEGMENTS = [
    { id: "NORMAL", min: 0.00, max: 0.30, label: "NORMAL", severity: "INFO" },
    { id: "DELAYED", min: 0.30, max: 0.50, label: "DELAYED", severity: "WARN" },
    { id: "DISRUPTED", min: 0.50, max: 0.65, label: "DISRUPTED", severity: "WARN" },
    { id: "SEVERE", min: 0.65, max: 0.80, label: "SEVERE", severity: "ALERT" },
    { id: "CLOSED", min: 0.80, max: 1.01, label: "CLOSED", severity: "ALERT" }
];

export const SNAPSHOT_REQUIRED_KEYS = ["intel_feed", "indicators", "hypotheses", "routes", "checklist"];

export const DEFAULT_DASHBOARD_CANDIDATES = [
    "https://raw.githubusercontent.com/macho715/iran-war-notelm/urgentdash-live/live/hyie_state.json",
    "/api/state",
    "./api/state",
    "api/state",
    "./data/dashboard.json"
];

export function getDashboardCandidates() {
    const env = import.meta?.env?.VITE_DASHBOARD_CANDIDATES;
    if (typeof env === "string" && env.trim()) {
        return env
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return DEFAULT_DASHBOARD_CANDIDATES;
}
src / lib / utils.js
import { FALLBACK_EGRESS_LOSS_ETA, GST_TIMEZONE, MIN_EVIDENCE_SOURCES } from "./constants.js";

export function clamp01(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
}

export function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function clampEgress(v, fallback = FALLBACK_EGRESS_LOSS_ETA) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return Math.min(999, n);
}

export function normalizeWhitespace(s) {
    return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function safeGetLS(key, fallback = null) {
    try {
        if (typeof window === "undefined") return fallback;
        const v = window.localStorage.getItem(key);
        return v == null ? fallback : v;
    } catch {
        return fallback;
    }
}

export function safeSetLS(key, value) {
    try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, value);
    } catch { }
}

export function safeJsonParse(raw, fallback) {
    try {
        const v = JSON.parse(raw);
        return v ?? fallback;
    } catch {
        return fallback;
    }
}

// "Mar 4 09:10" 같은 ts → ISO
export function toTsIso(value) {
    if (!value) return "";
    const text = String(value || "").trim();

    const m = text.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/i);
    const monthMap = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

    const d = m && monthMap[m[1].toLowerCase()] !== undefined
        ? new Date(new Date().getFullYear(), monthMap[m[1].toLowerCase()], Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5] || "0"), 0)
        : new Date(text);

    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function splitSources(raw = "") {
    return [
        ...new Set(
            String(raw)
                .split(/\/|,/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => s.replace(/\s+\(.*?\)$/, "").trim())
                .filter(Boolean)
        )
    ];
}

export function inferEvidenceFromSource(raw) {
    const sources = splitSources(raw);
    const sourceCount = Math.max(sources.length, 0);
    return { sourceCount, verified: sourceCount >= MIN_EVIDENCE_SOURCES };
}

export function summarizeSourceHealth(raw) {
    if (!raw || typeof raw !== "object") return { ok: null, total: null };
    const rows = Object.values(raw);
    if (!rows.length) return { ok: null, total: null };
    const ok = rows.filter((r) => Boolean(r && r.ok)).length;
    return { ok, total: rows.length };
}

export function formatTimeGST(tsIso) {
    if (!tsIso) return "—";
    const d = new Date(tsIso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: GST_TIMEZONE });
}

export function formatDateTimeGST(dateLike = new Date()) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ko-KR", { timeZone: GST_TIMEZONE, hour12: false });
}

export function deepClone(obj) {
    if (typeof structuredClone === "function") return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

export function downloadJson(filename, dataObj) {
    const json = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function tryCopyText(text) {
    const t = String(text || "");
    if (!t) return false;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(t);
            return true;
        }
    } catch { }

    // fallback
    try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return Boolean(ok);
    } catch {
        return false;
    }
}

export function truncate(s, max = 140) {
    const t = normalizeWhitespace(s);
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + "…";
}
src / lib / routeGeo.js
/**
 * ⚠️ 좌표는 “대략”값입니다. 실제 운영용이면 반드시 검증/보정하세요.
 * 노드 좌표만 바꾸면 지도 경로가 바로 바뀝니다.
 */
export const ROUTE_GEO = {
    nodes: {
        ABU: { latlng: [24.4539, 54.3773], label: "Abu Dhabi" },
        ALAIN: { latlng: [24.2075, 55.7447], label: "Al Ain" },
        MEZY: { latlng: [24.0540, 55.7780], label: "Mezyad (border)" },
        FUJ: { latlng: [25.1288, 56.3265], label: "Fujairah" },

        BURA: { latlng: [24.2500, 55.7933], label: "Buraimi" },
        SOHAR: { latlng: [24.3470, 56.7090], label: "Sohar" },
        NIZWA: { latlng: [22.9333, 57.5333], label: "Nizwa" },

        KHATM: { latlng: [25.9950, 56.3470], label: "Khatmat Malaha" },
        MUSC: { latlng: [23.5880, 58.3829], label: "Muscat" },

        GHUW: { latlng: [23.5500, 53.8000], label: "Ghuwaifat" },
        RIY: { latlng: [24.7136, 46.6753], label: "Riyadh" }
    },

    routes: {
        A: ["ABU", "ALAIN", "BURA", "SOHAR"],
        B: ["ABU", "MEZY", "NIZWA"],
        C: ["ABU", "GHUW", "RIY"],
        D: ["ABU", "FUJ", "KHATM", "MUSC"]
    }
};
src / lib / normalize.js
import { SNAPSHOT_REQUIRED_KEYS } from "./constants.js";
import { clamp01, clampEgress, inferEvidenceFromSource, summarizeSourceHealth, toTsIso, normalizeWhitespace, safeNumber } from "./utils.js";

export function normalizeConflictStats(raw = {}) {
    const toInt = (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
    };

    const startDateStr = normalizeWhitespace(raw?.conflict_start_date ?? raw?.conflictStartDate ?? "2026-02-28") || "2026-02-28";
    const rawDay = raw?.conflict_day ?? raw?.conflictDay;
    let conflict_day = Number.isFinite(Number(rawDay)) ? Math.trunc(Number(rawDay)) : null;

    const startDate = new Date(startDateStr);
    if (conflict_day == null && !Number.isNaN(startDate.getTime())) {
        const now = new Date();
        conflict_day = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1);
    }

    return {
        conflict_start_date: startDateStr,
        conflict_day,
        missiles_total: toInt(raw?.missiles_total ?? raw?.missilesTotal),
        missiles_intercepted: toInt(raw?.missiles_intercepted ?? raw?.missilesIntercepted),
        drones_total: toInt(raw?.drones_total ?? raw?.dronesTotal),
        drones_destroyed: toInt(raw?.drones_destroyed ?? raw?.dronesDestroyed),
        casualties_kia: toInt(raw?.casualties_kia ?? raw?.casualtiesKia),
        casualties_wia: toInt(raw?.casualties_wia ?? raw?.casualtiesWia)
    };
}

function normalizeIntelFeedItem(raw = {}, idx = 0) {
    const tsIso = normalizeWhitespace(raw?.tsIso || raw?.ts_iso || toTsIso(raw?.ts) || "");
    const ts = normalizeWhitespace(raw?.ts || "");
    const priority = normalizeWhitespace(raw?.priority || "MEDIUM").toUpperCase();
    const category = normalizeWhitespace(raw?.category || "GENERAL").toUpperCase();
    const text = normalizeWhitespace(raw?.text || "");
    const sources = normalizeWhitespace(raw?.sources || raw?.src || "");

    const id =
        normalizeWhitespace(raw?.id) ||
        (tsIso ? `${tsIso}-${idx}` : `feed-${idx}-${Math.random().toString(16).slice(2)}`);

    return { id, ts, tsIso, priority, category, text, sources };
}

function normalizeIndicatorItem(raw = {}, idx = 0) {
    const id = normalizeWhitespace(raw?.id || `I??-${idx}`);
    const name = normalizeWhitespace(raw?.name || "Indicator");
    const tier = normalizeWhitespace(raw?.tier || raw?.level || "TIER2").toUpperCase();

    const state = clamp01(raw?.state);
    const detail = normalizeWhitespace(raw?.detail || raw?.note || "");
    const src = normalizeWhitespace(raw?.src || raw?.sources || "");
    const ts = normalizeWhitespace(raw?.ts || "");
    const tsIso = normalizeWhitespace(raw?.tsIso || raw?.ts_iso || toTsIso(ts) || "");

    const inferred = inferEvidenceFromSource(src);
    const srcCount = Number.isFinite(Number(raw?.srcCount)) ? Math.max(0, Math.trunc(Number(raw.srcCount))) : inferred.sourceCount;
    const cv = typeof raw?.cv === "boolean" ? raw.cv : inferred.verified;

    return { id, name, tier, state, cv, detail, src, ts, tsIso, srcCount };
}

function normalizeHypothesisItem(raw = {}, idx = 0) {
    const id = normalizeWhitespace(raw?.id || `H?-${idx}`);
    const name = normalizeWhitespace(raw?.name || "Hypothesis");
    const score = clamp01(raw?.score);
    const detail = normalizeWhitespace(raw?.detail || "");
    return { id, name, score, detail };
}

function normalizeRouteItem(raw = {}, idx = 0) {
    const id = normalizeWhitespace(raw?.id || `R-${idx}`);
    const name = normalizeWhitespace(raw?.name || "Route");

    const statusRaw = normalizeWhitespace(raw?.status || "OPEN").toUpperCase();
    const status = ["OPEN", "CAUTION", "BLOCKED"].includes(statusRaw) ? statusRaw : "OPEN";

    const base_h = Math.max(0, safeNumber(raw?.base_h ?? raw?.baseH, 0));
    const cong = clamp01(raw?.cong);

    const note = normalizeWhitespace(raw?.note || "");
    const newsRefs = Array.isArray(raw?.newsRefs) ? raw.newsRefs : [];

    return { id, name, base_h, status, cong, note, newsRefs };
}

function normalizeChecklistItem(raw = {}, idx = 0) {
    const id = Number.isFinite(Number(raw?.id)) ? Number(raw.id) : idx + 1;
    const text = normalizeWhitespace(raw?.text || "");
    const done = Boolean(raw?.done);
    return { id, text, done };
}

export function normalizeMetadata(raw = {}) {
    const stateTs = normalizeWhitespace(raw?.stateTs ?? raw?.state_ts ?? raw?.state_ts_gst ?? "");
    const status = normalizeWhitespace(raw?.status ?? "").toLowerCase();
    const degraded = Boolean(raw?.degraded);

    const egressLossETA = clampEgress(raw?.egressLossETA ?? raw?.egress_loss_eta ?? raw?.egressLossEta ?? raw?.egress_loss_eta_hours);
    const evidenceConf = clamp01(raw?.evidenceConf ?? raw?.evidence_conf);
    const effectiveThreshold = clamp01(raw?.effectiveThreshold ?? raw?.effective_threshold ?? 0.8);
    const deltaScore = safeNumber(raw?.deltaScore ?? raw?.delta_score, 0);
    const urgency = clamp01(raw?.urgency);

    const triggers = (raw?.triggers && typeof raw.triggers === "object") ? raw.triggers : {};

    const conflictStats = normalizeConflictStats(raw?.conflictStats ?? raw?.conflict_stats ?? {});
    const sourceHealth = raw?.sourceHealth ?? raw?.source_health ?? null;
    const { ok, total } = summarizeSourceHealth(sourceHealth);

    const source = normalizeWhitespace(raw?.source || "");

    return {
        stateTs,
        status,
        degraded,
        egressLossETA,
        evidenceConf,
        effectiveThreshold,
        deltaScore,
        urgency,
        triggers,
        conflictStats,
        sourceHealth,
        sourceOk: ok,
        sourceTotal: total,
        source
    };
}

export function normalizeDashboard(dash) {
    if (!dash || typeof dash !== "object") return null;

    const intelFeedRaw = dash.intelFeed ?? dash.intel_feed ?? [];
    const indicatorsRaw = dash.indicators ?? [];
    const hypothesesRaw = dash.hypotheses ?? [];
    const routesRaw = dash.routes ?? [];
    const checklistRaw = dash.checklist ?? [];

    const intelFeed = (Array.isArray(intelFeedRaw) ? intelFeedRaw : []).map(normalizeIntelFeedItem);
    const indicators = (Array.isArray(indicatorsRaw) ? indicatorsRaw : []).map(normalizeIndicatorItem);
    const hypotheses = (Array.isArray(hypothesesRaw) ? hypothesesRaw : []).map(normalizeHypothesisItem);
    const routes = (Array.isArray(routesRaw) ? routesRaw : []).map(normalizeRouteItem);
    const checklist = (Array.isArray(checklistRaw) ? checklistRaw : []).map(normalizeChecklistItem);

    const metadata = normalizeMetadata(dash.metadata ?? {});

    return { intelFeed, indicators, hypotheses, routes, checklist, metadata };
}

export function hasSnapshotShape(obj) {
    if (!obj || typeof obj !== "object") return false;
    return SNAPSHOT_REQUIRED_KEYS.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

export function snapshotToDashboard(snapshot) {
    const dash = {
        intelFeed: snapshot?.intel_feed,
        indicators: snapshot?.indicators,
        hypotheses: snapshot?.hypotheses,
        routes: snapshot?.routes,
        checklist: snapshot?.checklist,
        metadata: snapshot?.metadata
    };
    return normalizeDashboard(dash);
}

export function normalizeIncomingPayload(payload) {
    if (!payload || typeof payload !== "object") return null;

    if (hasSnapshotShape(payload)) return snapshotToDashboard(payload);
    if (hasSnapshotShape(payload.snapshot)) return snapshotToDashboard(payload.snapshot);
    if (hasSnapshotShape(payload.data)) return snapshotToDashboard(payload.data);
    if (payload.dashboard && typeof payload.dashboard === "object") return normalizeDashboard(payload.dashboard);

    // 이미 정규화된 형태일 수도 있음
    const normalized = normalizeDashboard(payload);
    if (normalized && normalized.indicators?.length && normalized.hypotheses?.length) return normalized;

    return null;
}
src / lib / deriveState.js
import { EVIDENCE_FLOOR_T0_TARGET, I02_SEGMENTS, FALLBACK_EGRESS_LOSS_ETA } from "./constants.js";
import { clamp01, clampEgress, safeNumber, truncate } from "./utils.js";
import { normalizeConflictStats } from "./normalize.js";

export function getI02Segment(state) {
    const s = clamp01(state);
    const hit = I02_SEGMENTS.find((b) => s >= b.min && s < b.max) || I02_SEGMENTS[I02_SEGMENTS.length - 1];
    return hit;
}

export function deriveState(dash, egressLossETAOverride) {
    const indicators = Array.isArray(dash?.indicators) ? dash.indicators : [];
    const hypotheses = Array.isArray(dash?.hypotheses) ? dash.hypotheses : [];

    const findIndicator = (id) => indicators.find((row) => row.id === id) || {};
    const i01 = findIndicator("I01");
    const i02 = findIndicator("I02");
    const i03 = findIndicator("I03");
    const i04 = findIndicator("I04");

    const hypothesesSorted = [...hypotheses].sort((a, b) => safeNumber(b?.score, 0) - safeNumber(a?.score, 0));
    const leadingHypothesis = hypothesesSorted[0] || { id: "H?", name: "Unknown", score: 0 };
    const leadingColor = leadingHypothesis.id === "H2" ? "#ef4444" : leadingHypothesis.id === "H1" ? "#f59e0b" : "#22c55e";

    const dsFromMeta = dash?.metadata?.deltaScore;
    const ds = Number.isFinite(Number(dsFromMeta))
        ? Number(dsFromMeta)
        : safeNumber(hypotheses.find((h) => h.id === "H2")?.score, 0) - safeNumber(hypotheses.find((h) => h.id === "H1")?.score, 0);

    const ecFromMeta = dash?.metadata?.evidenceConf;
    const ec = Number.isFinite(Number(ecFromMeta)) ? clamp01(ecFromMeta) : 0;

    const thresholdFromMeta = dash?.metadata?.effectiveThreshold;
    const effectiveThreshold = Number.isFinite(Number(thresholdFromMeta)) ? clamp01(thresholdFromMeta) : 0.8;

    const triggers = dash?.metadata?.triggers || {};
    const liveDegraded = Boolean(dash?.metadata?.degraded);

    const gateStay = clamp01(i01?.state) >= 0.7 || Boolean(triggers.kr_leave_immediately);
    const gateStrike = Boolean(triggers.strike_detected) || clamp01(i03?.state) >= 0.7;
    const gateRoad = Boolean(triggers.border_change) || clamp01(i04?.state) >= 0.6;
    const gateActiveCount = [gateStay, gateStrike, gateRoad].filter(Boolean).length;
    const gateState = gateActiveCount >= 2 ? "BLOCKED" : gateActiveCount === 1 ? "CAUTION" : "OPEN";

    const modeState = liveDegraded ? "DEGRADED" : (Boolean(triggers.red_imminent) || ds >= 0.2 ? "RED_PREP" : "AMBER");
    const modeColor = modeState === "DEGRADED" ? "#ef4444" : modeState === "RED_PREP" ? "#f59e0b" : "#22c55e";

    const evidenceState = ec >= effectiveThreshold ? "PASSED" : "WATCH";

    // 기존 3단계
    const i02State = clamp01(i02?.state);
    const airspaceState = i02State >= 0.8 ? "CLOSED" : i02State >= 0.5 ? "DISRUPTED" : "OPEN";
    const airspaceHint = truncate(i02?.detail || "", 48);

    // 요청하신 “세부 구간”
    const i02Seg = getI02Segment(i02State);

    const h2Score = safeNumber(hypotheses.find((row) => row.id === "H2")?.score, 0);
    const likelihoodLabel = h2Score >= 0.8 ? "HIGHLY LIKELY" : h2Score >= 0.55 ? "LIKELY" : h2Score >= 0.35 ? "POSSIBLE" : "UNLIKELY";
    const likelihoodBand = h2Score >= 0.8 ? ">=80%" : h2Score >= 0.55 ? "55-80%" : h2Score >= 0.35 ? "35-55%" : "<35%";
    const likelihoodBasis = `H2 ${h2Score.toFixed(3)} / ΔScore ${ds.toFixed(3)} / Conf ${ec.toFixed(3)}`;

    const evidenceFloorT0 = indicators.filter((i) => i.tier === "TIER0" && i.cv).length;
    const evidenceFloorPassed = evidenceFloorT0 >= EVIDENCE_FLOOR_T0_TARGET;

    const urgencyFromMeta = dash?.metadata?.urgency;
    const egress =
        Number.isFinite(Number(egressLossETAOverride)) ? Number(egressLossETAOverride)
            : (Number.isFinite(Number(dash?.metadata?.egressLossETA)) ? Number(dash.metadata.egressLossETA) : FALLBACK_EGRESS_LOSS_ETA);

    const urgencyScore = Number.isFinite(Number(urgencyFromMeta))
        ? clamp01(urgencyFromMeta)
        : Math.min(1, Math.max(0, 1 - clampEgress(egress) / 12));

    const confBand = ec >= 0.8 ? "HIGH" : ec >= 0.6 ? "MEDIUM-HIGH" : ec >= 0.4 ? "MEDIUM" : "LOW";

    const conflictStats = normalizeConflictStats(dash?.metadata?.conflictStats || {});
    const conflictDayLabel = Number.isFinite(Number(conflictStats.conflict_day)) ? `Day ${conflictStats.conflict_day}` : "n/a";

    const sourceOk = dash?.metadata?.sourceOk;
    const sourceTotal = dash?.metadata?.sourceTotal;
    const liveSource = dash?.metadata?.source || "n/a";
    const sourceHealthLabel =
        (typeof sourceOk === "number" && Number.isFinite(sourceOk) && typeof sourceTotal === "number" && Number.isFinite(sourceTotal))
            ? `${sourceOk}/${sourceTotal} ok`
            : "n/a";

    const dsGap = 0.20 - ds;
    const dsGapLabel = ds >= 0.20 ? `ΔScore 임계 초과 +${Math.abs(dsGap).toFixed(3)}` : `0.20까지 ${Math.abs(dsGap).toFixed(3)} 차이`;
    const dsStateIcon = ds >= 0.20 ? "✅" : "⚠";
    const dsActionLabel = ds >= 0.20 ? "RED_PREP 조건 충족(유지)" : "추가 에스컬레이션 시 RED_PREP 전환";

    const confDelta = ec - effectiveThreshold;
    const confDeltaLabel =
        ec >= effectiveThreshold
            ? `Conf ${ec.toFixed(3)} ≥ ${effectiveThreshold.toFixed(3)} → RED 조건 충족`
            : `Conf ${ec.toFixed(3)} < ${effectiveThreshold.toFixed(3)} → RED 미충족 (${Math.abs(confDelta).toFixed(3)} 차이)`;

    const escalationItems = [
        { text: "한국 대사관 'Leave immediately' 발령", active: Boolean(triggers.kr_leave_immediately), note: `현재: ${Boolean(triggers.kr_leave_immediately) ? "감지됨" : "미감지"}` },
        { text: "미국 Level 4 Do Not Travel 격상", active: clamp01(i01?.state) >= 0.95, note: `I01 state=${clamp01(i01?.state).toFixed(2)}` },
        { text: "국경 RESTRICTED/CLOSED 감지", active: Boolean(triggers.border_change), note: `I04 state=${clamp01(i04?.state).toFixed(2)}` },
        { text: `ΔScore ≥ 0.20 돌파 (현재 ${ds >= 0.20 ? `+${(ds - 0.20).toFixed(3)}` : `${Math.abs(0.20 - ds).toFixed(3)} 차이`})`, active: ds >= 0.20, note: "threshold=0.20" },
        { text: "추가 대규모 strike 감지", active: Boolean(triggers.strike_detected), note: `trigger=${Boolean(triggers.strike_detected)}` }
    ];

    const deEscalationItems = [
        { text: "영공 재개 + 항공 정상화", ok: airspaceState === "OPEN", note: airspaceHint || "I02 detail n/a" },
        { text: "strike window 해제", ok: !gateStrike, note: `strike=${gateStrike ? "active" : "clear"}` },
        { text: "국경 통제 해제", ok: !gateRoad, note: `border=${gateRoad ? "restricted" : "clear"}` },
        { text: "Evidence 대비 Threshold 하향 안정", ok: ec < effectiveThreshold && ds < 0.20, note: `confΔ=${(ec - effectiveThreshold).toFixed(3)}` }
    ];

    return {
        i01, i02, i03, i04,
        hypothesesSorted, leadingHypothesis, leadingColor,
        ds, ec, effectiveThreshold, confBand,
        triggers, liveDegraded,
        gateStay, gateStrike, gateRoad, gateActiveCount, gateState,
        modeState, modeColor,
        evidenceState,
        airspaceState, airspaceHint,
        airspaceSegment: i02Seg.id,
        airspaceSegmentSeverity: i02Seg.severity,
        h2Score, likelihoodLabel, likelihoodBand, likelihoodBasis,
        evidenceFloorT0, evidenceFloorPassed,
        urgencyScore,
        conflictStats, conflictDayLabel,
        sourceHealthLabel, liveSource,
        dsGapLabel, dsStateIcon, dsActionLabel, confDeltaLabel,
        escalationItems, deEscalationItems
    };
}
src / lib / timelineRules.js
import {
    EVIDENCE_FLOOR_T0_TARGET,
    ROUTE_BUFFER_FACTOR,
    ROUTE_CONGESTION_DELTA,
    ROUTE_EFF_SPIKE_HOURS,
    ROUTE_EFF_SPIKE_RATIO
} from "./constants.js";
import { clamp01, normalizeWhitespace, truncate } from "./utils.js";

export function mkEvent({ level = "INFO", category = "SYSTEM", title = "", detail = "", ts = null }) {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: ts || new Date().toISOString(),
        level,
        category,
        title,
        detail
    };
}

export function computeDashboardKey(dash) {
    if (!dash || typeof dash !== "object") return "";
    const meta = dash.metadata || {};
    const ts = String(meta.stateTs || "");
    const status = String(meta.status || "");
    const degraded = meta.degraded ? "1" : "0";

    const h = Array.isArray(dash.hypotheses)
        ? dash.hypotheses.map((x) => `${x.id}:${Number(x.score || 0).toFixed(3)}`).join("|")
        : "";

    const i = Array.isArray(dash.indicators)
        ? dash.indicators.map((x) => `${x.id}:${Number(x.state || 0).toFixed(2)}:${x.cv ? 1 : 0}:${Number(x.srcCount || 0)}`).join("|")
        : "";

    const r = Array.isArray(dash.routes)
        ? dash.routes.map((x) => `${x.id}:${x.status}:${Number(x.cong || 0).toFixed(2)}:${Number(x.base_h || 0).toFixed(1)}`).join("|")
        : "";

    const top = (dash.intelFeed || [])[0];
    const f = top ? String(top.tsIso || top.ts || top.text || "") : "";

    return `${ts}#${status}#${degraded}#${h}#${i}#${r}#${f}`;
}

export function appendHistory(prev, dash, derived, maxPoints = 96) {
    const key = computeDashboardKey(dash);
    if (!key) return prev;

    const last = prev[prev.length - 1];
    if (last && last.key === key) return prev;

    const point = {
        key,
        ts: new Date().toISOString(),
        stateTs: String(dash?.metadata?.stateTs || ""),
        scores: {
            H0: Number((dash.hypotheses || []).find((x) => x.id === "H0")?.score || 0),
            H1: Number((dash.hypotheses || []).find((x) => x.id === "H1")?.score || 0),
            H2: Number((dash.hypotheses || []).find((x) => x.id === "H2")?.score || 0)
        },
        ds: Number(derived.ds || 0),
        ec: Number(derived.ec || 0),
        thr: Number(derived.effectiveThreshold || 0.8),
        mode: derived.modeState,
        gate: derived.gateState,
        air: derived.airspaceState,
        ev: derived.evidenceState,
        i02seg: derived.airspaceSegment
    };

    const next = [...prev, point];
    if (next.length > maxPoints) {
        next.splice(0, next.length - maxPoints);
    }
    return next;
}

function routeEffHours(route) {
    const base = Number(route?.base_h || 0);
    const cong = Number(route?.cong || 0);
    if (!Number.isFinite(base) || base <= 0) return null;
    const eff = base * (1 + Math.max(0, cong)) * ROUTE_BUFFER_FACTOR;
    return Number.isFinite(eff) ? eff : null;
}

function severityForAirspaceSeg(segId = "") {
    const s = String(segId || "").toUpperCase();
    if (s === "CLOSED") return "ALERT";
    if (s === "SEVERE") return "ALERT";
    if (s === "DISRUPTED") return "WARN";
    if (s === "DELAYED") return "WARN";
    return "INFO";
}

export function buildDiffEvents(prevDash, nextDash, prevDerived, nextDerived) {
    const events = [];
    const ts = new Date().toISOString();

    if (!prevDash || !prevDerived) {
        events.push(mkEvent({
            level: "INFO",
            category: "SYSTEM",
            title: "Dashboard loaded",
            detail: `source=${nextDash?.metadata?.source || "local"}`,
            ts
        }));
        return events;
    }

    // 1) MODE / GATE / EVIDENCE 기본 변화
    if (prevDerived.modeState !== nextDerived.modeState) {
        events.push(mkEvent({
            level: nextDerived.modeState === "DEGRADED" ? "ALERT" : nextDerived.modeState === "RED_PREP" ? "WARN" : "INFO",
            category: "MODE",
            title: `MODE 변경: ${prevDerived.modeState} → ${nextDerived.modeState}`,
            detail: `Δ=${Number(nextDerived.ds || 0).toFixed(3)} / Conf=${Number(nextDerived.ec || 0).toFixed(3)} / Gate=${nextDerived.gateState}`,
            ts
        }));
    }

    if (prevDerived.gateState !== nextDerived.gateState) {
        events.push(mkEvent({
            level: nextDerived.gateState === "BLOCKED" ? "ALERT" : nextDerived.gateState === "CAUTION" ? "WARN" : "INFO",
            category: "GATE",
            title: `Gate 변경: ${prevDerived.gateState} → ${nextDerived.gateState}`,
            detail: `active=${nextDerived.gateActiveCount}/3 (Stay=${nextDerived.gateStay ? "Y" : "N"}, Strike=${nextDerived.gateStrike ? "Y" : "N"}, Road=${nextDerived.gateRoad ? "Y" : "N"})`,
            ts
        }));
    }

    if (prevDerived.evidenceState !== nextDerived.evidenceState) {
        events.push(mkEvent({
            level: nextDerived.evidenceState === "PASSED" ? "INFO" : "WARN",
            category: "EVIDENCE",
            title: `Evidence 상태: ${prevDerived.evidenceState} → ${nextDerived.evidenceState}`,
            detail: `Conf=${Number(nextDerived.ec || 0).toFixed(3)} vs Thr=${Number(nextDerived.effectiveThreshold || 0.8).toFixed(3)}`,
            ts
        }));
    }

    // 2) ✅ TIER0 Evidence floor 변화 (요청사항)
    const prevFloor = Number(prevDerived.evidenceFloorT0 ?? 0);
    const nextFloor = Number(nextDerived.evidenceFloorT0 ?? 0);
    const prevPassed = prevFloor >= EVIDENCE_FLOOR_T0_TARGET;
    const nextPassed = nextFloor >= EVIDENCE_FLOOR_T0_TARGET;

    if (prevPassed !== nextPassed) {
        events.push(mkEvent({
            level: nextPassed ? "INFO" : "WARN",
            category: "EVIDENCE",
            title: nextPassed ? "Evidence Floor PASSED" : "Evidence Floor FAILED",
            detail: `TIER0 cv count ${prevFloor} → ${nextFloor} (target=${EVIDENCE_FLOOR_T0_TARGET})`,
            ts
        }));
    } else if (prevFloor !== nextFloor) {
        const dir = nextFloor > prevFloor ? "↑" : "↓";
        events.push(mkEvent({
            level: nextFloor < EVIDENCE_FLOOR_T0_TARGET ? "WARN" : "INFO",
            category: "EVIDENCE",
            title: `TIER0 Evidence floor 변경 ${dir}`,
            detail: `cv count ${prevFloor} → ${nextFloor} (target=${EVIDENCE_FLOOR_T0_TARGET})`,
            ts
        }));
    }

    // 3) ✈️ I02 공항/영공 “세부 구간” 변화 (요청사항)
    if (prevDerived.airspaceSegment !== nextDerived.airspaceSegment) {
        events.push(mkEvent({
            level: severityForAirspaceSeg(nextDerived.airspaceSegment),
            category: "AIRSPACE",
            title: `I02 세부 구간: ${prevDerived.airspaceSegment} → ${nextDerived.airspaceSegment}`,
            detail: `I02 state ${clamp01(prevDerived.i02?.state).toFixed(2)} → ${clamp01(nextDerived.i02?.state).toFixed(2)} / hint="${nextDerived.airspaceHint || ""}"`,
            ts
        }));
    }

    // I02 detail 문구 변경도 별도 기록 (요청사항)
    const prevI02Detail = normalizeWhitespace(prevDerived?.i02?.detail || "");
    const nextI02Detail = normalizeWhitespace(nextDerived?.i02?.detail || "");
    if (prevI02Detail && nextI02Detail && prevI02Detail !== nextI02Detail) {
        events.push(mkEvent({
            level: "INFO",
            category: "AIRSPACE",
            title: "I02 detail 업데이트",
            detail: `prev="${truncate(prevI02Detail, 120)}"\nnext="${truncate(nextI02Detail, 120)}"`,
            ts
        }));
    }

    // 4) 🛣️ Route diffs + effective time 급증 (요청사항)
    const prevRoutes = new Map((prevDash.routes || []).map((r) => [r.id, r]));

    for (const r of (nextDash.routes || [])) {
        const p = prevRoutes.get(r.id);
        if (!p) continue;

        // 상태 변경
        if (p.status !== r.status) {
            events.push(mkEvent({
                level: r.status === "BLOCKED" ? "ALERT" : r.status === "CAUTION" ? "WARN" : "INFO",
                category: "ROUTE",
                title: `Route ${r.id} 상태: ${p.status} → ${r.status}`,
                detail: r.note || "",
                ts
            }));
        } else {
            // 혼잡도 변화
            const dc = Math.abs((Number(p.cong) || 0) - (Number(r.cong) || 0));
            if (dc >= ROUTE_CONGESTION_DELTA) {
                events.push(mkEvent({
                    level: "WARN",
                    category: "ROUTE",
                    title: `Route ${r.id} 혼잡도 변화`,
                    detail: `cong ${(Number(p.cong) || 0).toFixed(2)} → ${(Number(r.cong) || 0).toFixed(2)}`,
                    ts
                }));
            }
        }

        // ✅ effective time spike
        const prevEff = routeEffHours(p);
        const nextEff = routeEffHours(r);

        if (Number.isFinite(prevEff) && Number.isFinite(nextEff) && nextEff > prevEff) {
            const abs = nextEff - prevEff;
            const ratio = prevEff > 0 ? (nextEff / prevEff - 1) : 0;

            const spike = abs >= ROUTE_EFF_SPIKE_HOURS && ratio >= ROUTE_EFF_SPIKE_RATIO;

            if (spike) {
                events.push(mkEvent({
                    level: "WARN",
                    category: "ROUTE",
                    title: `Route ${r.id} effective time 급증`,
                    detail:
                        `eff ${prevEff.toFixed(1)}h → ${nextEff.toFixed(1)}h (Δ${abs.toFixed(1)}h, +${Math.round(ratio * 100)}%)\n` +
                        `base ${Number(p.base_h || 0).toFixed(1)}→${Number(r.base_h || 0).toFixed(1)} / cong ${(Number(p.cong) || 0).toFixed(2)}→${(Number(r.cong) || 0).toFixed(2)} (buffer x${ROUTE_BUFFER_FACTOR})`,
                    ts
                }));
            }
        }
    }

    // 5) Hypothesis lead 변화 + ΔScore 임계 돌파
    if (prevDerived.leadingHypothesis?.id !== nextDerived.leadingHypothesis?.id) {
        events.push(mkEvent({
            level: "INFO",
            category: "HYPOTHESIS",
            title: `Leading 변경: ${prevDerived.leadingHypothesis?.id || "?"} → ${nextDerived.leadingHypothesis?.id || "?"}`,
            detail: `${nextDerived.leadingHypothesis?.name || ""}`,
            ts
        }));
    }

    if (Number(prevDerived.ds || 0) < 0.20 && Number(nextDerived.ds || 0) >= 0.20) {
        events.push(mkEvent({
            level: "ALERT",
            category: "MODE",
            title: "ΔScore 임계 돌파",
            detail: `ΔScore ${Number(nextDerived.ds || 0).toFixed(3)} ≥ 0.20`,
            ts
        }));
    }

    // 6) intel top diff
    const prevTop = (prevDash.intelFeed || [])[0];
    const nextTop = (nextDash.intelFeed || [])[0];
    const prevKey = prevTop ? String(prevTop.tsIso || prevTop.ts || prevTop.text || "") : "";
    const nextKey = nextTop ? String(nextTop.tsIso || nextTop.ts || nextTop.text || "") : "";

    if (prevKey && nextKey && prevKey !== nextKey) {
        events.push(mkEvent({
            level: nextTop.priority === "CRITICAL" ? "ALERT" : nextTop.priority === "HIGH" ? "WARN" : "INFO",
            category: "INTEL",
            title: `새 Intel: ${nextTop.priority}`,
            detail: nextTop.text || "",
            ts
        }));
    }

    return events;
}
src / lib / summary.js
import { ROUTE_BUFFER_FACTOR } from "./constants.js";
import { formatDateTimeGST } from "./utils.js";

export function buildOfflineSummary(dash, derived) {
    const topIntel = (dash.intelFeed || []).slice(0, 3);
    const routes = Array.isArray(dash.routes) ? dash.routes : [];

    const usable = routes
        .filter((r) => r.status !== "BLOCKED")
        .map((r) => ({ ...r, eff: r.base_h * (1 + (r.cong || 0)) * ROUTE_BUFFER_FACTOR }))
        .sort((a, b) => a.eff - b.eff);

    const lines = [];
    lines.push(`요약(${formatDateTimeGST(new Date())} GST)`);
    lines.push(`- MODE: ${derived.modeState} / Gate: ${derived.gateState} / Airspace: ${derived.airspaceState}(${derived.airspaceSegment}) / Evidence: ${derived.evidenceState}`);
    lines.push(`- Leading: ${derived.leadingHypothesis.id} (${derived.leadingHypothesis.name}) score=${Number(derived.leadingHypothesis.score || 0).toFixed(3)} / H2=${derived.h2Score.toFixed(3)} → ${derived.likelihoodLabel} (${derived.likelihoodBand})`);
    lines.push(`- RED 지표: ΔScore=${derived.ds.toFixed(3)} (thr=0.20) / Conf=${derived.ec.toFixed(3)} vs Thr=${derived.effectiveThreshold.toFixed(3)} / Urgency=${derived.urgencyScore.toFixed(2)}`);
    lines.push(`- Evidence floor(TIER0 cv): ${derived.evidenceFloorT0} (target=3) → ${derived.evidenceFloorPassed ? "PASSED" : "NOT YET"}`);

    if (usable.length) {
        lines.push(`- 추천 이동(사용 가능): ${usable.slice(0, 2).map((r) => `Route ${r.id} ${r.status} ~${r.eff.toFixed(1)}h`).join(" · ")}`);
    } else {
        lines.push(`- 추천 이동: 사용 가능한 루트 없음(BLOCKED)`);
    }

    if (topIntel.length) {
        lines.push(`- 최신 Intel Top3:`);
        topIntel.forEach((it, idx) => {
            lines.push(`  ${idx + 1}) [${it.priority}] ${it.text}`);
        });
    }

    return lines.join("\n");
}
4) data
src / data / fallbackDashboard.js
import { normalizeDashboard } from "../lib/normalize.js";

export const FALLBACK_DASHBOARD = {
    intelFeed: [
        { ts: "Mar 4 09:10", priority: "CRITICAL", category: "MIL", text: "걸프 지역 긴장 고조 — 일부 공항 운항 변동 가능", sources: "BBC/Al Jazeera" },
        { ts: "Mar 4 08:30", priority: "HIGH", category: "AVIATION", text: "항공사 공지: 특정 구간 재평가 진행", sources: "Etihad/Emirates" },
        { ts: "Mar 4 07:55", priority: "MEDIUM", category: "BORDER", text: "오만 방향 육로 혼잡 증가 가능성", sources: "SNS/Local" }
    ],
    indicators: [
        { id: "I01", name: "KR/US travel advisory", tier: "TIER0", state: 0.62, cv: true, detail: "Advisory watch", src: "KR MFA/US State", ts: "Mar 4 08:40" },
        { id: "I02", name: "Airspace/Airport status", tier: "TIER0", state: 0.48, cv: true, detail: "부분 지연(일부 슬롯 제한)", src: "Airport ops/Etihad", ts: "Mar 4 08:20" },
        { id: "I03", name: "Strike window", tier: "TIER1", state: 0.35, cv: true, detail: "추가 strike 신호 낮음", src: "OSINT/Local", ts: "Mar 4 07:50" },
        { id: "I04", name: "Border/Roadblocks", tier: "TIER1", state: 0.25, cv: false, detail: "국경 통제 징후 낮음", src: "Traffic/Local", ts: "Mar 4 07:40" }
    ],
    hypotheses: [
        { id: "H0", name: "De-escalation / stabilization", score: 0.25, detail: "확전 억제 신호" },
        { id: "H1", name: "Contained escalation", score: 0.35, detail: "제한적 충돌 지속" },
        { id: "H2", name: "Regional spillover", score: 0.40, detail: "확전/연쇄 차질 가능" }
    ],
    routes: [
        { id: "A", name: "Abu Dhabi → Al Ain → Buraimi → Sohar", base_h: 5.7, status: "OPEN", cong: 0.22, note: "내륙 우회로, 변동 적음", newsRefs: [] },
        { id: "B", name: "Abu Dhabi → Mezyad → Nizwa", base_h: 6.5, status: "CAUTION", cong: 0.40, note: "보더 대기 증가 가능", newsRefs: [] },
        { id: "C", name: "Abu Dhabi → Ghuwaifat → Riyadh", base_h: 13.4, status: "OPEN", cong: 0.18, note: "장거리, 보급 필요", newsRefs: [] },
        { id: "D", name: "Fujairah → Khatmat Malaha → Muscat", base_h: 9.3, status: "BLOCKED", cong: 0.35, note: "동해안 차단 상태", newsRefs: [] }
    ],
    checklist: [
        { id: 1, text: "Bug-out bag (여권/ID/현금/물/비상식량)", done: false },
        { id: 2, text: "차량 연료 Full 확인", done: false },
        { id: 3, text: "오만 보험(Orange Card) 확인", done: false },
        { id: 4, text: "대사관 긴급번호 저장", done: false },
        { id: 5, text: "오프라인 맵 다운로드", done: false },
        { id: 6, text: "비상연락망 업데이트", done: false },
        { id: 7, text: "15분마다 공지/뉴스 확인", done: false },
        { id: 8, text: "경보 수신 채널 점검", done: false }
    ],
    metadata: {
        stateTs: new Date().toISOString(),
        status: "fallback",
        degraded: false,
        egressLossETA: 2,
        evidenceConf: 0.55,
        effectiveThreshold: 0.80,
        deltaScore: 0.05,
        urgency: 0.30,
        triggers: {
            kr_leave_immediately: false,
            strike_detected: false,
            border_change: false,
            red_imminent: false
        },
        conflictStats: {
            conflict_start_date: "2026-02-28",
            missiles_total: 12,
            missiles_intercepted: 8,
            drones_total: 24,
            drones_destroyed: 18
        }
    }
};

export const INITIAL_DASHBOARD = normalizeDashboard(FALLBACK_DASHBOARD) || FALLBACK_DASHBOARD;
5) components
src / components / ui.js
import React from "react";

export function Card({ children, style }) {
    return (
        <div
            style={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                ...style
            }}
        >
            {children}
        </div>
    );
}

export function Pill({ label, value, color = "#94a3b8" }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 999, padding: "6px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 11, color, fontWeight: 900, fontFamily: "monospace" }}>{value}</div>
        </div>
    );
}

export function Bar({ value = 0, color = "#22c55e", h = 8 }) {
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    return (
        <div style={{ height: h, background: "#111827", borderRadius: 999, overflow: "hidden", border: "1px solid #1e293b" }}>
            <div style={{ width: `${v * 100}%`, height: "100%", background: color }} />
        </div>
    );
}

export function Gauge({ value = 0, label = "", sub = "" }) {
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    const gaugeColor = v >= 0.8 ? "#ef4444" : v >= 0.4 ? "#f59e0b" : "#22c55e";

    const cx = 45, cy = 52, r = 28;
    const a = v * 180;
    const rad = (deg) => (deg * Math.PI) / 180;
    const sa = 180, ea = 180 - a;
    const x2 = cx + r * Math.cos(rad(ea));
    const y2 = cy - r * Math.sin(rad(ea));

    return (
        <div style={{ textAlign: "center" }}>
            <svg width={90} height={65} viewBox="0 0 90 65">
                <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e293b" strokeWidth={5} strokeLinecap="round" />
                {v > 0 && (
                    <path
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${x2} ${y2}`}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth={5}
                        strokeLinecap="round"
                    />
                )}
                <text x={cx} y={cy - 8} textAnchor="middle" fill={gaugeColor} fontSize={16} fontWeight={800} fontFamily="monospace">
                    {v.toFixed(3)}
                </text>
                <text x={cx} y={cy + 6} textAnchor="middle" fill="#94a3b8" fontSize={9}>
                    {label}
                </text>
            </svg>
            {sub && <div style={{ fontSize: 10, color: "#64748b", marginTop: -4 }}>{sub}</div>}
        </div>
    );
}
src / components / charts.js
import React from "react";

export function Sparkline({ data = [], min = 0, max = 1, color = "#60a5fa", height = 44 }) {
    const width = 220;
    const n = Array.isArray(data) ? data.length : 0;

    if (n < 2) {
        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
                <rect x="0" y="0" width={width} height={height} rx="10" fill="#0b1220" stroke="#1e293b" />
                <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fill="#475569" fontSize="11">
                    no data
                </text>
            </svg>
        );
    }

    const clamp = (v) => Math.min(max, Math.max(min, v));
    const span = (max - min) || 1;
    const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * width);

    const ys = xs.map((_, i) => {
        const v = Number(data[i] ?? 0);
        const vv = Number.isFinite(v) ? clamp(v) : 0;
        return height - ((vv - min) / span) * height;
    });

    const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
            <rect x="0" y="0" width={width} height={height} rx="10" fill="#0b1220" stroke="#1e293b" />
            <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
        </svg>
    );
}

export function MultiLineChart({ series = [], min = 0, max = 1, height = 160 }) {
    const width = 560;
    const n = Math.max(0, ...(series.map((s) => (Array.isArray(s.data) ? s.data.length : 0))));

    if (n < 2) {
        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
                <rect x="0" y="0" width={width} height={height} rx="12" fill="#0b1220" stroke="#1e293b" />
                <text x={width / 2} y={height / 2} textAnchor="middle" fill="#475569" fontSize="11">
                    no history yet
                </text>
            </svg>
        );
    }

    const clamp = (v) => Math.min(max, Math.max(min, v));
    const span = (max - min) || 1;
    const xs = Array.from({ length: n }, (_, i) => (i / (n - 1)) * width);

    const gridY = [0.25, 0.5, 0.75].map((p) => height - p * height);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
            <rect x="0" y="0" width={width} height={height} rx="12" fill="#0b1220" stroke="#1e293b" />
            {gridY.map((y, i) => (
                <line key={i} x1="0" x2={width} y1={y} y2={y} stroke="#111827" strokeWidth="1" />
            ))}
            {series.map((s, si) => {
                const data = Array.isArray(s.data) ? s.data : [];
                const ys = xs.map((_, i) => {
                    const v = Number(data[i] ?? 0);
                    const vv = Number.isFinite(v) ? clamp(v) : 0;
                    return height - ((vv - min) / span) * height;
                });

                const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");
                const lastX = xs[xs.length - 1];
                const lastY = ys[ys.length - 1];

                return (
                    <g key={si}>
                        <path d={path} fill="none" stroke={s.color || "#60a5fa"} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
                        <circle cx={lastX} cy={lastY} r="3.6" fill={s.color || "#60a5fa"} />
                    </g>
                );
            })}
        </svg>
    );
}
src / components / RouteMapLeaflet.jsx
src / components / TimelinePanel.jsx
src / components / Simulator.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "./ui.js";
import { clamp01, clampEgress, deepClone } from "../lib/utils.js";
import { normalizeDashboard } from "../lib/normalize.js";
import { deriveState } from "../lib/deriveState.js";
import { ROUTE_BUFFER_FACTOR } from "../lib/constants.js";

export default function Simulator({ liveDash, onLog = () => { } }) {
    const [sim, setSim] = useState(null);

    const buildInitialSim = useCallback(() => {
        const dash = liveDash || {};
        const findH = (id) => (dash.hypotheses || []).find((x) => x.id === id)?.score ?? 0;
        const findI = (id) => (dash.indicators || []).find((x) => x.id === id)?.state ?? 0;

        return {
            hypotheses: {
                H0: clamp01(findH("H0")),
                H1: clamp01(findH("H1")),
                H2: clamp01(findH("H2"))
            },
            indicators: {
                I01: clamp01(findI("I01")),
                I02: clamp01(findI("I02")),
                I03: clamp01(findI("I03")),
                I04: clamp01(findI("I04"))
            },
            triggers: { ...(dash.metadata?.triggers || {}) },
            degraded: Boolean(dash.metadata?.degraded),
            egressLossETA: clampEgress(dash.metadata?.egressLossETA ?? 2),
            evidenceConf: clamp01(dash.metadata?.evidenceConf ?? 0.55),
            effectiveThreshold: clamp01(dash.metadata?.effectiveThreshold ?? 0.8),
            deltaScore: Number.isFinite(Number(dash.metadata?.deltaScore)) ? Number(dash.metadata.deltaScore) : 0,
            routes: (dash.routes || []).map((r) => ({
                id: r.id,
                status: r.status,
                cong: clamp01(r.cong),
                base_h: Math.max(0, Number(r.base_h || 0))
            }))
        };
    }, [liveDash]);

    useEffect(() => {
        setSim(buildInitialSim());
    }, [buildInitialSim]);

    const buildDashFromSim = useCallback((s) => {
        if (!s) return null;
        const dash = liveDash || {};

        const hyp = ["H0", "H1", "H2"].map((id) => ({
            ...(dash.hypotheses || []).find((x) => x.id === id),
            id,
            name: (dash.hypotheses || []).find((x) => x.id === id)?.name || id,
            score: clamp01(s.hypotheses[id] || 0)
        }));

        const ind = ["I01", "I02", "I03", "I04"].map((id) => ({
            ...(dash.indicators || []).find((x) => x.id === id),
            id,
            name: (dash.indicators || []).find((x) => x.id === id)?.name || id,
            state: clamp01(s.indicators[id] || 0),
            srcCount: (dash.indicators || []).find((x) => x.id === id)?.srcCount ?? 0,
            cv: (dash.indicators || []).find((x) => x.id === id)?.cv ?? true
        }));

        const routes = (s.routes || []).map((r) => ({
            ...(dash.routes || []).find((x) => x.id === r.id),
            ...r
        }));

        const next = {
            intelFeed: dash.intelFeed || [],
            indicators: ind,
            hypotheses: hyp,
            routes,
            checklist: dash.checklist || [],
            metadata: {
                ...(dash.metadata || {}),
                egressLossETA: clampEgress(s.egressLossETA),
                evidenceConf: clamp01(s.evidenceConf),
                effectiveThreshold: clamp01(s.effectiveThreshold ?? 0.8),
                deltaScore: Number(s.deltaScore || 0),
                degraded: Boolean(s.degraded),
                triggers: { ...(s.triggers || {}) },
                source: "SIMULATOR",
                status: "sim",
                stateTs: new Date().toISOString()
            }
        };

        return normalizeDashboard(next) || next;
    }, [liveDash]);

    const simDash = useMemo(() => buildDashFromSim(sim), [sim, buildDashFromSim]);
    const simDerived = useMemo(() => (simDash ? deriveState(simDash, sim?.egressLossETA) : null), [simDash, sim]);

    const update = (path, value) => {
        setSim((prev) => {
            if (!prev) return prev;
            const next = deepClone(prev);
            const parts = path.split(".");
            let cur = next;
            for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
            cur[parts[parts.length - 1]] = value;
            return next;
        });
    };

    const toggleTrig = (k) => {
        setSim((prev) => {
            if (!prev) return prev;
            return { ...prev, triggers: { ...prev.triggers, [k]: !prev.triggers?.[k] } };
        });
    };

    if (!sim || !simDash || !simDerived) {
        return <div style={{ color: "#94a3b8", fontSize: 12 }}>Simulator initializing…</div>;
    }

    const routeStatusColor = (st) => (st === "BLOCKED" ? "#ef4444" : st === "CAUTION" ? "#f59e0b" : "#22c55e");

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 10 }}>
            <Card style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900 }}>🧪 Scenario Simulator</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>가정치를 바꾸면 파생 상태(MODE/Gate/I02 segment/Route eff)가 즉시 재계산됩니다.</div>
                    </div>
                    <button
                        onClick={() => {
                            onLog({
                                level: "INFO",
                                category: "SIM",
                                title: "Simulator snapshot logged",
                                detail: `MODE=${simDerived.modeState} Gate=${simDerived.gateState} I02seg=${simDerived.airspaceSegment} Δ=${simDerived.ds.toFixed(3)} Conf=${simDerived.ec.toFixed(3)}`
                            });
                        }}
                        style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                    >
                        Log to timeline
                    </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {/* Hypotheses */}
                    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>Hypotheses</div>
                        {["H0", "H1", "H2"].map((id) => (
                            <div key={id} style={{ marginTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                                    <span style={{ fontWeight: 900, color: id === "H2" ? "#ef4444" : id === "H1" ? "#f59e0b" : "#22c55e" }}>{id}</span>
                                    <span style={{ fontFamily: "monospace" }}>{Number(sim.hypotheses[id] || 0).toFixed(2)}</span>
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={Number(sim.hypotheses[id] || 0)} onChange={(e) => update(`hypotheses.${id}`, Number(e.target.value))} style={{ width: "100%" }} />
                            </div>
                        ))}
                    </div>

                    {/* Meta sliders */}
                    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>Engine</div>

                        {[
                            ["evidenceConf", "evidenceConf", 0, 1, 0.01],
                            ["effectiveThreshold", "effectiveThreshold", 0, 1, 0.01],
                            ["deltaScore", "deltaScore", -0.2, 0.6, 0.01],
                            ["egressLossETA", "egressLossETA(h)", 0, 12, 0.1]
                        ].map(([key, label, min, max, step]) => (
                            <div key={key} style={{ marginTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                                    <span style={{ fontWeight: 900 }}>{label}</span>
                                    <span style={{ fontFamily: "monospace" }}>{Number(sim[key] || 0).toFixed(2)}</span>
                                </div>
                                <input type="range" min={min} max={max} step={step} value={Number(sim[key] || 0)} onChange={(e) => update(key, Number(e.target.value))} style={{ width: "100%" }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Indicators + triggers */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>Indicators (I01~I04)</div>
                        {["I01", "I02", "I03", "I04"].map((id) => (
                            <div key={id} style={{ marginTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                                    <span style={{ fontWeight: 900 }}>{id}</span>
                                    <span style={{ fontFamily: "monospace" }}>{Number(sim.indicators[id] || 0).toFixed(2)}</span>
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={Number(sim.indicators[id] || 0)} onChange={(e) => update(`indicators.${id}`, Number(e.target.value))} style={{ width: "100%" }} />
                            </div>
                        ))}
                    </div>

                    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>Triggers</div>

                        {[
                            ["kr_leave_immediately", "KR leave immediately"],
                            ["strike_detected", "strike_detected"],
                            ["border_change", "border_change"],
                            ["red_imminent", "red_imminent"]
                        ].map(([k, label]) => (
                            <label key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, cursor: "pointer" }}>
                                <input type="checkbox" checked={Boolean(sim.triggers?.[k])} onChange={() => toggleTrig(k)} />
                                <span style={{ fontSize: 12, color: "#e2e8f0" }}>{label}</span>
                            </label>
                        ))}

                        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }}>
                            <input type="checkbox" checked={Boolean(sim.degraded)} onChange={() => update("degraded", !sim.degraded)} />
                            <span style={{ fontSize: 12, color: "#e2e8f0" }}>degraded</span>
                        </label>
                    </div>
                </div>

                {/* Routes quick edit */}
                <div style={{ marginTop: 12, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, fontWeight: 900 }}>Routes (what-if)</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>status / congestion / base_h</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        {(sim.routes || []).map((r, idx) => (
                            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                                <div style={{ fontSize: 12, fontWeight: 900, color: "#e2e8f0" }}>Route {r.id}</div>

                                <select
                                    value={r.status}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setSim((prev) => {
                                            const next = deepClone(prev);
                                            next.routes[idx].status = v;
                                            return next;
                                        });
                                    }}
                                    style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: routeStatusColor(r.status), padding: "8px 10px", fontWeight: 900 }}
                                >
                                    <option value="OPEN">OPEN</option>
                                    <option value="CAUTION">CAUTION</option>
                                    <option value="BLOCKED">BLOCKED</option>
                                </select>

                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
                                        <span>cong</span>
                                        <span style={{ fontFamily: "monospace" }}>{Number(r.cong || 0).toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={Number(r.cong || 0)}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setSim((prev) => {
                                                const next = deepClone(prev);
                                                next.routes[idx].cong = v;
                                                return next;
                                            });
                                        }}
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
                                        <span>base_h</span>
                                        <span style={{ fontFamily: "monospace" }}>{Number(r.base_h || 0).toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="24"
                                        step="0.1"
                                        value={Number(r.base_h || 0)}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setSim((prev) => {
                                                const next = deepClone(prev);
                                                next.routes[idx].base_h = v;
                                                return next;
                                            });
                                        }}
                                        style={{ width: "100%" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 12, fontSize: 10, color: "#475569" }}>
                    💡 Simulator는 라이브 데이터를 바꾸지 않습니다. “Log to timeline”으로 기록만 남깁니다.
                </div>
            </Card>

            {/* Right: Derived snapshot */}
            <Card style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900 }}>파생 상태</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                        ["MODE", simDerived.modeState, simDerived.modeColor],
                        ["Gate", simDerived.gateState, simDerived.gateState === "BLOCKED" ? "#ef4444" : simDerived.gateState === "CAUTION" ? "#f59e0b" : "#22c55e"],
                        ["Airspace", `${simDerived.airspaceState} (${simDerived.airspaceSegment})`, simDerived.airspaceState === "OPEN" ? "#22c55e" : simDerived.airspaceState === "DISRUPTED" ? "#f59e0b" : "#ef4444"],
                        ["Evidence", simDerived.evidenceState, simDerived.evidenceState === "PASSED" ? "#22c55e" : "#f59e0b"]
                    ].map(([k, v, c]) => (
                        <div key={k} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{k}</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 12, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>추천 루트(사용 가능)</div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>buffer x{ROUTE_BUFFER_FACTOR} 반영</div>
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        {(() => {
                            const list = (simDash.routes || [])
                                .filter((r) => r.status !== "BLOCKED")
                                .map((r) => ({ id: r.id, status: r.status, eff: r.base_h * (1 + r.cong) * ROUTE_BUFFER_FACTOR }))
                                .sort((a, b) => a.eff - b.eff);

                            if (!list.length) return <div style={{ fontSize: 12, color: "#fca5a5" }}>사용 가능한 루트가 없습니다.</div>;

                            return list.slice(0, 3).map((r) => (
                                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, border: "1px solid #1e293b", background: "#0f172a" }}>
                                    <div style={{ fontSize: 12, fontWeight: 900 }}>
                                        Route {r.id}{" "}
                                        <span style={{ fontSize: 10, color: routeStatusColor(r.status), fontWeight: 900 }}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <div style={{ fontFamily: "monospace", fontWeight: 900 }}>{r.eff.toFixed(1)}h</div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </Card>
        </div>
    );
}
6) App(탭 / Fetch / Timeline 자동 기록 포함)
src / App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Bar, Gauge, Pill } from "./components/ui.js";
import { MultiLineChart, Sparkline } from "./components/charts.js";
import RouteMapLeaflet from "./components/RouteMapLeaflet.jsx";
import TimelinePanel from "./components/TimelinePanel.jsx";
import Simulator from "./components/Simulator.jsx";

import { INITIAL_DASHBOARD } from "./data/fallbackDashboard.js";
import { deriveState } from "./lib/deriveState.js";
import { normalizeIncomingPayload } from "./lib/normalize.js";
import { buildOfflineSummary } from "./lib/summary.js";
import { appendHistory, buildDiffEvents, mkEvent, computeDashboardKey } from "./lib/timelineRules.js";

import {
    COUNTDOWN_SECONDS,
    FALLBACK_EGRESS_LOSS_ETA,
    HISTORY_MAX_POINTS,
    POLL_INTERVAL_MS,
    ROUTE_BUFFER_FACTOR,
    STORAGE_KEYS,
    TIMELINE_MAX,
    getDashboardCandidates
} from "./lib/constants.js";

import {
    clampEgress,
    downloadJson,
    formatDateTimeGST,
    formatTimeGST,
    safeGetLS,
    safeJsonParse,
    safeSetLS,
    tryCopyText
} from "./lib/utils.js";

export default function App() {
    const [now, setNow] = useState(new Date());
    const [tab, setTab] = useState("overview");
    const [nextEta, setNextEta] = useState(COUNTDOWN_SECONDS);

    const [dash, setDash] = useState(INITIAL_DASHBOARD);
    const [egressLossETA, setEgressLossETA] = useState(INITIAL_DASHBOARD?.metadata?.egressLossETA ?? FALLBACK_EGRESS_LOSS_ETA);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [history, setHistory] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState(null);

    const [summary, setSummary] = useState({ text: "", ts: null, mode: "OFFLINE" });
    const [autoSummary, setAutoSummary] = useState(false);

    const mounted = useRef(true);
    const synced = useRef(false);
    const prevDashRef = useRef(null);
    const prevDerivedRef = useRef(null);

    const didStartTicker = useRef(false);
    const didStartFetch = useRef(false);

    const derived = useMemo(() => deriveState(dash, egressLossETA), [dash, egressLossETA]);

    // Load persisted state once
    useEffect(() => {
        const rawE = Number(safeGetLS(STORAGE_KEYS.egress, ""));
        if (Number.isFinite(rawE) && rawE >= 0) setEgressLossETA(rawE);

        const rawHist = safeGetLS(STORAGE_KEYS.history, "");
        const parsedHist = safeJsonParse(rawHist, []);
        if (Array.isArray(parsedHist)) setHistory(parsedHist);

        const rawTl = safeGetLS(STORAGE_KEYS.timeline, "");
        const parsedTl = safeJsonParse(rawTl, []);
        if (Array.isArray(parsedTl)) setTimeline(parsedTl);

        const a = safeGetLS(STORAGE_KEYS.autoSummary, "0");
        setAutoSummary(a === "1");
    }, []);

    // Persist
    useEffect(() => {
        safeSetLS(STORAGE_KEYS.egress, String(Number.isFinite(egressLossETA) ? egressLossETA : FALLBACK_EGRESS_LOSS_ETA));
    }, [egressLossETA]);

    useEffect(() => {
        safeSetLS(STORAGE_KEYS.history, JSON.stringify(history.slice(-HISTORY_MAX_POINTS)));
    }, [history]);

    useEffect(() => {
        safeSetLS(STORAGE_KEYS.timeline, JSON.stringify(timeline.slice(0, TIMELINE_MAX)));
    }, [timeline]);

    useEffect(() => {
        safeSetLS(STORAGE_KEYS.autoSummary, autoSummary ? "1" : "0");
    }, [autoSummary]);

    const logEvent = useCallback((ev) => {
        setTimeline((prev) => {
            const next = [mkEvent(ev), ...prev];
            return next.slice(0, TIMELINE_MAX);
        });
    }, []);

    const mergeChecklist = (payloadChecklist, prevChecklist) => {
        const next = (payloadChecklist || []).map((item) => {
            const prev = (prevChecklist || []).find((p) => p.id === item.id);
            return prev ? { ...item, done: prev.done } : item;
        });
        return next;
    };

    const applyDashboard = useCallback((nextDash) => {
        const egressNext = clampEgress(nextDash?.metadata?.egressLossETA);
        const nextDerived = deriveState(nextDash, egressNext);

        setDash(nextDash);
        setEgressLossETA(egressNext);

        // checklist done 유지
        setDash((prev) => {
            const merged = { ...nextDash, checklist: mergeChecklist(nextDash.checklist, prev.checklist) };
            return merged;
        });

        synced.current = true;

        // history + diff events
        setHistory((prev) => appendHistory(prev, nextDash, nextDerived, HISTORY_MAX_POINTS));

        const prevDash = prevDashRef.current;
        const prevDer = prevDerivedRef.current;
        const diff = buildDiffEvents(prevDash, nextDash, prevDer, nextDerived);

        if (diff.length) {
            setTimeline((prev) => {
                const nextTL = [...diff, ...prev];
                return nextTL.slice(0, TIMELINE_MAX);
            });
        }

        prevDashRef.current = nextDash;
        prevDerivedRef.current = nextDerived;
    }, []);

    const fetchDashboard = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const candidates = getDashboardCandidates();
            let normalized = null;

            for (const candidate of candidates) {
                try {
                    const sep = candidate.includes("?") ? "&" : "?";
                    const r = await fetch(`${candidate}${sep}t=${Date.now()}`, { cache: "no-store" });
                    if (!r.ok) continue;

                    const payload = await r.json();
                    normalized = normalizeIncomingPayload(payload);

                    if (normalized?.metadata) normalized.metadata.source = candidate;
                    if (normalized) break;
                } catch {
                    // try next
                }
            }

            if (!normalized) throw new Error("Invalid payload");

            if (!mounted.current) return;
            applyDashboard(normalized);

            setError(null);
            setLastUpdated(new Date());
            setNextEta(COUNTDOWN_SECONDS); // countdown reset
        } catch (err) {
            if (!mounted.current) return;
            if (!synced.current) applyDashboard(INITIAL_DASHBOARD);

            setError("데이터를 불러오지 못했습니다. 기본 데이터를 표시합니다.");
            logEvent({ level: "WARN", category: "SYSTEM", title: "Fetch failed → fallback", detail: String(err?.message || err || "") });
        } finally {
            if (showLoading && mounted.current) setLoading(false);
        }
    }, [applyDashboard, logEvent]);

    // Ticker
    useEffect(() => {
        if (didStartTicker.current) return;
        didStartTicker.current = true;

        const t = setInterval(() => {
            setNow(new Date());
            setNextEta((p) => (p <= 0 ? COUNTDOWN_SECONDS : p - 1));
        }, 1000);

        return () => {
            mounted.current = false;
            clearInterval(t);
        };
    }, []);

    // Fetch interval
    useEffect(() => {
        if (didStartFetch.current) return;
        didStartFetch.current = true;

        mounted.current = true;
        fetchDashboard(true);
        const id = setInterval(() => fetchDashboard(false), POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchDashboard]);

    // Auto summary on new dashboard key
    const lastSummaryKeyRef = useRef("");
    useEffect(() => {
        if (!autoSummary) return;
        const k = computeDashboardKey(dash);
        if (!k || k === lastSummaryKeyRef.current) return;
        lastSummaryKeyRef.current = k;

        const text = buildOfflineSummary(dash, derived);
        setSummary({ text, ts: new Date().toISOString(), mode: "OFFLINE" });
    }, [autoSummary, dash, derived]);

    const tabs = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "analysis", label: "Trends & Log", icon: "📈" },
        { id: "intel", label: "Intel Feed", icon: "🔴" },
        { id: "indicators", label: "Indicators", icon: "📡" },
        { id: "routes", label: "Routes", icon: "🗺️" },
        { id: "sim", label: "Simulator", icon: "🧪" },
        { id: "checklist", label: "Checklist", icon: "✅" }
    ];

    const updateTs = lastUpdated
        ? lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dubai" })
        : "—";

    const gstDateTime = useMemo(() => formatDateTimeGST(now), [now]);

    // history series
    const histH0 = useMemo(() => history.map((p) => p.scores?.H0 ?? 0), [history]);
    const histH1 = useMemo(() => history.map((p) => p.scores?.H1 ?? 0), [history]);
    const histH2 = useMemo(() => history.map((p) => p.scores?.H2 ?? 0), [history]);
    const histDs = useMemo(() => history.map((p) => p.ds ?? 0), [history]);
    const histEc = useMemo(() => history.map((p) => p.ec ?? 0), [history]);

    const exportTimeline = () => {
        const name = `timeline_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
        downloadJson(name, timeline);
        logEvent({ level: "INFO", category: "SYSTEM", title: "Timeline exported", detail: name });
    };

    const usableRoutes = useMemo(() => {
        const list = (dash.routes || [])
            .filter((r) => r.status !== "BLOCKED")
            .map((r) => ({ ...r, eff: r.base_h * (1 + (r.cong || 0)) * ROUTE_BUFFER_FACTOR }))
            .sort((a, b) => a.eff - b.eff);
        return list;
    }, [dash.routes]);

    return (
        <div style={{ minHeight: "100vh", padding: 12, maxWidth: 980, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e1b4b)", border: "1px solid #334155", borderRadius: 16, padding: "14px 18px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>HYIE ERC² Dashboard</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                            GST: {gstDateTime} · last fetch: {updateTs} · next in: {Math.floor(nextEta / 60)}:{String(nextEta % 60).padStart(2, "0")}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <Pill label="MODE" value={derived.modeState} color={derived.modeColor} />
                        <Pill label="Gate" value={derived.gateState} color={derived.gateState === "BLOCKED" ? "#ef4444" : derived.gateState === "CAUTION" ? "#f59e0b" : "#22c55e"} />
                        <Pill label="I02" value={`${derived.airspaceState}/${derived.airspaceSegment}`} color={derived.airspaceState === "OPEN" ? "#22c55e" : derived.airspaceState === "DISRUPTED" ? "#f59e0b" : "#ef4444"} />
                        <button
                            onClick={() => fetchDashboard(true)}
                            style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ marginTop: 10, background: "rgba(239,68,68,0.10)", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 12, padding: "10px 12px", fontSize: 11 }}>
                        ❗ {error}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {tabs.map((t) => {
                    const active = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                background: active ? "#1e293b" : "#0b1220",
                                border: `1px solid ${active ? "#60a5fa" : "#1e293b"}`,
                                color: active ? "#e2e8f0" : "#94a3b8",
                                borderRadius: 12,
                                padding: "10px 12px",
                                fontSize: 12,
                                fontWeight: 900,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            }}
                        >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* OVERVIEW */}
            {tab === "overview" && (
                <div>
                    <Card>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <Gauge value={Math.min(1, Math.max(0, derived.ec))} label="EvidenceConf" sub={`thr=${derived.effectiveThreshold.toFixed(2)}`} />
                            <Gauge value={Math.min(1, Math.max(0, (derived.ds + 0.2) / 0.8))} label="ΔScore" sub={`raw=${derived.ds.toFixed(3)}`} />
                            <Gauge value={derived.urgencyScore} label="Urgency" sub={`egress=${Number(egressLossETA).toFixed(2)}h`} />
                        </div>

                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 900 }}>Likelihood</div>
                                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: derived.likelihoodLabel === "HIGHLY LIKELY" ? "#ef4444" : derived.likelihoodLabel === "LIKELY" ? "#f59e0b" : "#22c55e" }}>
                                    {derived.likelihoodLabel}
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{derived.likelihoodBand}</div>
                                <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>{derived.likelihoodBasis}</div>
                            </div>

                            <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 900 }}>Top routes (usable)</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>effective = base × (1+cong) × buffer</div>

                                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                    {usableRoutes.slice(0, 3).map((r) => (
                                        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "#0f172a", border: "1px solid #1e293b" }}>
                                            <div style={{ fontSize: 12, fontWeight: 900 }}>
                                                Route {r.id}{" "}
                                                <span style={{ fontSize: 10, marginLeft: 6, color: r.status === "CAUTION" ? "#f59e0b" : "#22c55e" }}>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div style={{ fontFamily: "monospace", fontWeight: 900 }}>{r.eff.toFixed(1)}h</div>
                                        </div>
                                    ))}
                                    {!usableRoutes.length && <div style={{ fontSize: 12, color: "#fca5a5" }}>사용 가능한 루트 없음</div>}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Summary */}
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 900 }}>🤖 AI-ish Situation Summary</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>룰 기반 요약(오프라인). auto summary를 켜면 업데이트마다 생성.</div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, color: "#cbd5e1" }}>
                                    <input type="checkbox" checked={autoSummary} onChange={(e) => setAutoSummary(e.target.checked)} />
                                    auto summary
                                </label>

                                <button
                                    onClick={() => {
                                        const text = buildOfflineSummary(dash, derived);
                                        setSummary({ text, ts: new Date().toISOString(), mode: "OFFLINE" });
                                        logEvent({ level: "INFO", category: "SUMMARY", title: "Summary generated" });
                                    }}
                                    style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                                >
                                    Generate
                                </button>

                                <button
                                    onClick={async () => {
                                        const ok = await tryCopyText(summary.text);
                                        logEvent({ level: ok ? "INFO" : "WARN", category: "SUMMARY", title: ok ? "Summary copied" : "Copy failed" });
                                    }}
                                    style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: 12, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                            <div style={{ fontSize: 10, color: "#64748b" }}>
                                {summary.ts ? `last: ${formatTimeGST(summary.ts)} · mode=${summary.mode}` : "no summary yet"}
                            </div>
                            <div style={{ marginTop: 10, fontSize: 12, whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                                {summary.text || "—"}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ANALYSIS */}
            {tab === "analysis" && (
                <div>
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 900 }}>📈 Hypothesis Trend Graph</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>최근 {history.length} 포인트 (최대 {HISTORY_MAX_POINTS})</div>
                            </div>
                            <button
                                onClick={() => {
                                    setHistory([]);
                                    logEvent({ level: "INFO", category: "SYSTEM", title: "History cleared" });
                                }}
                                style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#94a3b8", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                            >
                                Reset history
                            </button>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <MultiLineChart
                                height={160}
                                min={0}
                                max={1}
                                series={[
                                    { id: "H0", label: "H0", color: "#22c55e", data: histH0 },
                                    { id: "H1", label: "H1", color: "#f59e0b", data: histH1 },
                                    { id: "H2", label: "H2", color: "#ef4444", data: histH2 }
                                ]}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 6 }}>
                                    <span>ΔScore trend</span><span style={{ fontFamily: "monospace" }}>{derived.ds.toFixed(3)}</span>
                                </div>
                                <Sparkline data={histDs} min={-0.2} max={0.6} color="#f59e0b" />
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 6 }}>
                                    <span>EvidenceConf trend</span><span style={{ fontFamily: "monospace" }}>{derived.ec.toFixed(3)}</span>
                                </div>
                                <Sparkline data={histEc} min={0} max={1} color="#22c55e" />
                            </div>
                        </div>
                    </Card>

                    <Card style={{ marginBottom: 0 }}>
                        <TimelinePanel
                            timeline={timeline}
                            onClear={() => {
                                setTimeline([]);
                                logEvent({ level: "INFO", category: "SYSTEM", title: "Timeline cleared" });
                            }}
                            onExport={exportTimeline}
                        />
                    </Card>
                </div>
            )}

            {/* INTEL */}
            {tab === "intel" && (
                <div>
                    <Card>
                        <div style={{ fontSize: 13, fontWeight: 900 }}>🔴 Intel Feed</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>최신순</div>

                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                            {(dash.intelFeed || []).map((f) => (
                                <div key={f.id} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                        <div style={{ fontSize: 10, color: "#64748b" }}>{formatTimeGST(f.tsIso)}</div>
                                        <div style={{ fontSize: 10, color: f.priority === "CRITICAL" ? "#ef4444" : f.priority === "HIGH" ? "#f59e0b" : "#94a3b8", fontWeight: 900 }}>
                                            {f.priority}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 12, color: "#e2e8f0" }}>{f.text}</div>
                                    <div style={{ marginTop: 6, fontSize: 10, color: "#64748b" }}>
                                        sources: {f.sources || "n/a"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* INDICATORS */}
            {tab === "indicators" && (
                <div>
                    <Card>
                        <div style={{ fontSize: 13, fontWeight: 900 }}>📡 Indicators</div>

                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                            {(dash.indicators || []).map((ind) => {
                                const color = ind.state >= 0.8 ? "#ef4444" : ind.state >= 0.4 ? "#f59e0b" : "#22c55e";
                                return (
                                    <div key={ind.id} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 42, textAlign: "center", fontSize: 12, fontWeight: 900, fontFamily: "monospace", color }}>{ind.id}</div>
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 800 }}>{ind.name}</span>
                                                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: ind.tier === "TIER0" ? "rgba(239,68,68,0.15)" : ind.tier === "TIER1" ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)", color: ind.tier === "TIER0" ? "#fca5a5" : ind.tier === "TIER1" ? "#fcd34d" : "#94a3b8", fontWeight: 900 }}>
                                                            {ind.tier}
                                                        </span>
                                                        <span style={{ fontSize: 12, fontWeight: 900, fontFamily: "monospace", color }}>{ind.state.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 10, color: ind.cv ? "#22c55e" : "#f59e0b", fontWeight: 900 }}>
                                                {ind.cv ? "✓ 교차검증" : "△ 부분"}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: 10 }}>
                                            <Bar value={ind.state} color={color} h={8} />
                                        </div>

                                        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 10 }}>{ind.detail}</div>
                                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
                                            출처: {ind.src || "n/a"} · 최신: {formatTimeGST(ind.tsIso)} · 소스 {Math.max(ind.srcCount || 0, 0)}건
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 14, marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: derived.evidenceFloorPassed ? "#22c55e" : "#f59e0b" }}>
                                {derived.evidenceFloorPassed ? "✅ Evidence Floor PASSED" : "⚠ Evidence Floor not reached"}
                                {` — TIER0 교차검증: ${derived.evidenceFloorT0}건`}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ROUTES */}
            {tab === "routes" && (
                <div>
                    <Card>
                        <RouteMapLeaflet
                            routes={dash.routes}
                            selectedId={selectedRouteId}
                            onSelect={(rid) => setSelectedRouteId((prev) => (prev === rid ? null : rid))}
                        />
                        {selectedRouteId && (
                            <div style={{ marginTop: 12, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 12, padding: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 900 }}>Selected Route: {selectedRouteId}</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>아래 카드에서 해당 Route가 하이라이트됩니다.</div>
                            </div>
                        )}
                    </Card>

                    {(dash.routes || []).map((r) => {
                        const eff = r.base_h * (1 + r.cong) * ROUTE_BUFFER_FACTOR;
                        const isBlocked = r.status === "BLOCKED";
                        const isCaution = r.status === "CAUTION";
                        const borderColor = selectedRouteId === r.id ? "#3b82f6" : (isBlocked ? "#7f1d1d" : isCaution ? "#92400e" : "#1e293b");
                        const badgeBg = isBlocked ? "#7f1d1d" : isCaution ? "#92400e" : "#14532d";
                        const statusColor = isBlocked ? "#f87171" : isCaution ? "#f59e0b" : "#22c55e";

                        return (
                            <div key={r.id} style={{ background: "#0f172a", border: `2px solid ${borderColor}`, borderRadius: 12, padding: 16, marginBottom: 10, opacity: isBlocked ? 0.82 : 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: badgeBg, fontSize: 13, fontWeight: 900, color: "#fff" }}>
                                            {r.id}
                                        </span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 900 }}>{r.name}</div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 10, color: statusColor, fontWeight: 900 }}>{r.status}</span>
                                                {isBlocked && <span style={{ fontSize: 9, background: "#7f1d1d", color: "#fca5a5", padding: "2px 6px", borderRadius: 6, fontWeight: 900 }}>⛔ 사용금지</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: isBlocked ? "#f87171" : "#e2e8f0" }}>
                                            {isBlocked ? "—" : `${eff.toFixed(1)}h`}
                                        </div>
                                        <div style={{ fontSize: 10, color: "#64748b" }}>{isBlocked ? "차단" : `effective (buffer x${ROUTE_BUFFER_FACTOR})`}</div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                                    <div style={{ background: "#1e293b", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                        <div style={{ fontSize: 10, color: "#64748b" }}>Base</div>
                                        <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: "#94a3b8" }}>{r.base_h}h</div>
                                    </div>
                                    <div style={{ background: "#1e293b", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                        <div style={{ fontSize: 10, color: "#64748b" }}>Congestion</div>
                                        <div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace", color: r.cong > 0.5 ? "#f87171" : r.cong > 0.3 ? "#f59e0b" : "#22c55e" }}>
                                            {r.cong.toFixed(2)}
                                        </div>
                                    </div>
                                    <div style={{ background: "#1e293b", borderRadius: 10, padding: 10, textAlign: "center" }}>
                                        <div style={{ fontSize: 10, color: "#64748b" }}>Status</div>
                                        <div style={{ fontSize: 14, fontWeight: 900, color: statusColor }}>{r.status}</div>
                                    </div>
                                </div>

                                {r.note && <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 6 }}>{r.note}</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SIMULATOR */}
            {tab === "sim" && (
                <div>
                    <Simulator liveDash={dash} onLog={logEvent} />
                </div>
            )}

            {/* CHECKLIST */}
            {tab === "checklist" && (
                <div>
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 900 }}>✅ Checklist</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>준비 완료 체크(로컬 저장)</div>
                            </div>
                            <button
                                onClick={() => {
                                    setDash((prev) => ({ ...prev, checklist: (prev.checklist || []).map((c) => ({ ...c, done: false })) }));
                                    logEvent({ level: "INFO", category: "CHECKLIST", title: "Checklist reset" });
                                }}
                                style={{ background: "#0b1220", border: "1px solid #1e293b", color: "#94a3b8", borderRadius: 10, padding: "10px 12px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                            >
                                Reset
                            </button>
                        </div>

                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {(dash.checklist || []).map((c) => (
                                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#0b1220", border: "1px solid #1e293b", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(c.done)}
                                        onChange={() => {
                                            setDash((prev) => ({
                                                ...prev,
                                                checklist: (prev.checklist || []).map((x) => (x.id === c.id ? { ...x, done: !x.done } : x))
                                            }));
                                        }}
                                    />
                                    <div style={{ fontSize: 12, color: c.done ? "#86efac" : "#e2e8f0", fontWeight: 800 }}>
                                        {c.text}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            <div style={{ marginTop: 10, fontSize: 10, color: "#475569", textAlign: "center" }}>
                {loading ? "loading…" : "ready"} · source: {derived.liveSource} · sourceHealth: {derived.sourceHealthLabel}
            </div>
        </div>
    );
}
7) 실행 방법

위 구조대로 파일 생성

설치 & 실행

npm install
npm run dev
8) Mapbox로 바꾸고 싶다면(옵션) 💡

Leaflet은 “타일 URL”만 바꾸면 Mapbox 스타일도 사용 가능합니다.



프로젝트 루트에.env 생성:

VITE_LEAFLET_TILES_URL = https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=YOUR_TOKEN
VITE_LEAFLET_TILES_ATTRIBUTION =© Mapbox © OpenStreetMap

    (토큰은 직접 넣어야 합니다.)

9) 다음 개선 포인트(원하면 바로 이어서 붙여드림) 🤔

Route 선을 “실제 도로 경로”로 만들기(OSRM / Mapbox Directions API)

I02 detail을 단순 문자열 비교가 아니라 키워드 / 정규식 룰로 세분(“부분 운항”, “재개 시간”, “터미널별”)

Timeline에 “noise gate”(예: 같은 이벤트 10분 내 중복 억제) 추가

원하시면 “현재 운영 중인 API payload에 routeGeo(노드좌표 / 경유지)를 같이 넣는 방식”으로도 깔끔하게 정리해드릴게요
