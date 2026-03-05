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
