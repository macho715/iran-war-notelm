import { fetchArticles } from "../../lib/queries";

export default async function ArticlesPage() {
  const articles = await fetchArticles(200);
  return (
    <>
      <h1>Articles</h1>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        저장된 articles 최신 200건. (정렬: last_seen_ts DESC)
      </p>
      <table>
        <thead>
          <tr>
            <th>last_seen</th>
            <th>source</th>
            <th>city</th>
            <th>tier</th>
            <th>title</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.article_id}>
              <td><code>{a.last_seen_ts ?? ""}</code></td>
              <td>{a.source ?? ""}</td>
              <td>{a.city ?? ""}</td>
              <td>{a.tier ?? ""}</td>
              <td style={{ maxWidth: 540 }}>
                <a href={a.canonical_url} target="_blank" rel="noreferrer">
                  {a.title ?? a.canonical_url}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
