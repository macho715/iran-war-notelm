import { fetchRunsSafe } from "../../lib/queries";

export const dynamic = "force-dynamic";

function badge(level: string) {
  const map: Record<string, string> = {
    LOW: "🟢 LOW",
    MEDIUM: "🟡 MEDIUM",
    HIGH: "🟠 HIGH",
    CRITICAL: "🔴 CRITICAL"
  };
  return map[level] ?? level;
}

export default async function RunsPage() {
  const { rows: runs, error } = await fetchRunsSafe(200);
  return (
    <>
      <h1>Runs</h1>
      {error ? (
        <p style={{ padding: 10, border: "1px solid #fca5a5", borderRadius: 8, background: "#fff1f2" }}>
          DB 조회 실패: <code>{error}</code>
        </p>
      ) : null}
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        저장된 runs 최신 200건. (정렬: run_ts DESC)
      </p>
      <table>
        <thead>
          <tr>
            <th>run_ts</th>
            <th>threat</th>
            <th>score</th>
            <th>sentiment</th>
            <th>summary_ad</th>
            <th>summary_dxb</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.run_id}>
              <td><code>{r.run_ts}</code></td>
              <td>{badge(r.threat_level)}</td>
              <td>{r.score}</td>
              <td>{r.sentiment ?? ""}</td>
              <td style={{ maxWidth: 300 }}>{r.summary_ad ?? ""}</td>
              <td style={{ maxWidth: 300 }}>{r.summary_dxb ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
