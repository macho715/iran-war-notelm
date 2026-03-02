import { fetchOutboxSafe } from "../../lib/queries";

export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  const { rows: outbox, error } = await fetchOutboxSafe(200);

  return (
    <>
      <h1>Outbox</h1>
      {error ? (
        <p style={{ padding: 10, border: "1px solid #fca5a5", borderRadius: 8, background: "#fff1f2" }}>
          DB 조회 실패: <code>{error}</code>
        </p>
      ) : null}
      <p style={{ fontSize: 13, opacity: 0.8 }}>저장된 outbox 메시지 최신 200건 (정렬: created_ts DESC)</p>
      <table>
        <thead>
          <tr>
            <th>msg_id</th>
            <th>run_id</th>
            <th>channel</th>
            <th>status</th>
            <th>attempts</th>
            <th>created_ts</th>
            <th>file_path</th>
            <th>last_error</th>
          </tr>
        </thead>
        <tbody>
          {outbox.map((o) => (
            <tr key={o.msg_id}>
              <td><code>{o.msg_id}</code></td>
              <td><code>{o.run_id ?? ""}</code></td>
              <td>{o.channel}</td>
              <td>{o.status}</td>
              <td>{o.attempts}</td>
              <td><code>{o.created_ts}</code></td>
              <td><code style={{ fontSize: 12 }}>{o.file_path ?? ""}</code></td>
              <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{o.last_error ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}