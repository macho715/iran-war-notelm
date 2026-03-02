import { getPool } from "./db";

export type RunRow = {
  run_id: string;
  run_ts: string;
  threat_level: string;
  score: number;
  sentiment: string | null;
  summary_ad: string | null;
  summary_dxb: string | null;
  notebook_url: string | null;
};

export type ArticleRow = {
  article_id: string;
  canonical_url: string;
  source: string | null;
  title: string | null;
  city: string | null;
  tier: string | null;
  first_seen_ts: string | null;
  last_seen_ts: string | null;
};

export type OutboxRow = {
  msg_id: string;
  run_id: string | null;
  channel: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_ts: string;
  file_path: string | null;
};

export type SafeRowsResult<T> = {
  rows: T[];
  error: string | null;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

async function queryRowsSafe<T>(label: string, queryFn: () => Promise<T[]>): Promise<SafeRowsResult<T>> {
  try {
    return { rows: await queryFn(), error: null };
  } catch (err) {
    const msg = errorMessage(err);
    console.error(`[dashboard] ${label} query failed: ${msg}`);
    return { rows: [], error: msg };
  }
}

export async function fetchRuns(limit = 24): Promise<RunRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<RunRow>(
    `SELECT run_id, run_ts, threat_level, score, sentiment, summary_ad, summary_dxb, notebook_url
     FROM runs
     ORDER BY run_ts DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function fetchRunsSafe(limit = 24): Promise<SafeRowsResult<RunRow>> {
  return queryRowsSafe("runs", () => fetchRuns(limit));
}

export async function fetchArticles(limit = 50): Promise<ArticleRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ArticleRow>(
    `SELECT article_id, canonical_url, source, title, city, tier, first_seen_ts, last_seen_ts
     FROM articles
     ORDER BY last_seen_ts DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function fetchArticlesSafe(limit = 50): Promise<SafeRowsResult<ArticleRow>> {
  return queryRowsSafe("articles", () => fetchArticles(limit));
}

export async function fetchOutbox(limit = 50): Promise<OutboxRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<OutboxRow>(
    `SELECT msg_id, run_id, channel, payload, status, attempts, last_error, created_ts, file_path
     FROM outbox
     ORDER BY created_ts DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function fetchOutboxSafe(limit = 50): Promise<SafeRowsResult<OutboxRow>> {
  return queryRowsSafe("outbox", () => fetchOutbox(limit));
}

export async function fetchOutboxMsg(msgId: string): Promise<OutboxRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<OutboxRow>(
    `SELECT msg_id, run_id, channel, payload, status, attempts, last_error, created_ts, file_path
     FROM outbox
     WHERE msg_id = $1`,
    [msgId]
  );
  return rows[0] ?? null;
}

export async function updateOutboxStatus(
  msgId: string,
  status: string,
  lastError: string | null = null
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE outbox
     SET status = $1, last_error = $2, attempts = attempts + 1
     WHERE msg_id = $3`,
    [status, lastError, msgId]
  );
}
