"use client";

import { useState } from "react";

type ResponsePayload = {
  ok: boolean;
  message?: string;
  error_code?: string | null;
  [key: string]: unknown;
};

type Props = {
  runId: string;
  sourceId?: string | null;
};

export default function RegenerateSummaryButton({ runId, sourceId }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleClick = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/notebooklm/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          source_id: sourceId || undefined,
          action: "report",
          format: "json",
        }),
      });

      const data = (await res.json()) as ResponsePayload;
      if (!res.ok || data.ok !== true) {
        setMessage(`실패: ${data.error_code ?? "ERROR"} ${data.message ?? "요청 실패"}`);
        return;
      }

      const outboxCount =
        typeof data.outbox_count === "number"
          ? data.outbox_count
          : typeof data.outbox_count === "string"
            ? Number(data.outbox_count)
            : 0;
      setMessage(`요청 성공 (run_id=${runId}, outbox=${outboxCount})`);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      setMessage(`요청 실패: ${err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={handleClick}
        style={{ padding: "4px 10px", cursor: busy ? "wait" : "pointer" }}
        disabled={busy}
      >
        {busy ? "요청 중..." : "요약 재생성"}
      </button>
      {message ? <span style={{ fontSize: 12, color: "#374151" }}>{message}</span> : null}
    </div>
  );
}
