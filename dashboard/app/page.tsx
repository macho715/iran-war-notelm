import { fetchArticles, fetchOutbox, fetchRuns } from "../lib/queries";

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

export default async function Page() {
  const [runs, articles, outbox] = await Promise.all([fetchRuns(24), fetchArticles(10), fetchOutbox(10)]);
  const latest = runs[0];

  return (
    <>
      <h1>Overview</h1>

      {!latest ? (
        <p>runs 데이터가 없습니다. (DATABASE_URL / 스키마 / GitHub Actions 실행 여부 확인)</p>
      ) : (
        <section style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{badge(latest.threat_level)}</div>
            <div>Score: <b>{latest.score}</b></div>
            <div>TS: <code>{latest.run_ts}</code></div>
            {latest.sentiment ? <div>Sentiment: <b>{latest.sentiment}</b></div> : null}
          </div>
          <div style={{ marginTop: 8 }}>
            {latest.summary_ad ? (
              <div><b>AD</b>: {latest.summary_ad}</div>
            ) : null}
            {latest.summary_dxb ? (
              <div><b>DXB</b>: {latest.summary_dxb}</div>
            ) : null}
            {latest.notebook_url ? (
              <div style={{ marginTop: 6 }}>
                NotebookLM: <a href={latest.notebook_url} target="_blank" rel="noreferrer">{latest.notebook_url}</a>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <h2>최근 24 Runs</h2>
      <table>
        <thead>
          <tr>
            <th>run_ts</th>
            <th>threat</th>
            <th>score</th>
            <th>sentiment</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.run_id}>
              <td><code>{r.run_ts}</code></td>
              <td>{badge(r.threat_level)}</td>
              <td>{r.score}</td>
              <td>{r.sentiment ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>최근 Articles (10)</h2>
      <table>
        <thead>
          <tr>
            <th>last_seen</th>
            <th>source</th>
            <th>title</th>
            <th>city</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.article_id}>
              <td><code>{a.last_seen_ts ?? ""}</code></td>
              <td>{a.source ?? ""}</td>
              <td>
                <a href={a.canonical_url} target="_blank" rel="noreferrer">
                  {a.title ?? a.canonical_url}
                </a>
              </td>
              <td>{a.city ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>최근 Outbox (10)</h2>
      <table>
        <thead>
          <tr>
            <th>created_ts</th>
            <th>channel</th>
            <th>status</th>
            <th>file_path</th>
          </tr>
        </thead>
        <tbody>
          {outbox.map((o) => (
            <tr key={o.msg_id}>
              <td><code>{o.created_ts}</code></td>
              <td>{o.channel}</td>
              <td>{o.status}</td>
              <td><code style={{ fontSize: 12 }}>{o.file_path ?? ""}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
