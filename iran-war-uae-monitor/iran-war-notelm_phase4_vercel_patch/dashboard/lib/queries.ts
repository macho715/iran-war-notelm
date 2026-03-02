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
  status: string;
  attempts: number;
  created_ts: string;
  file_path: string | null;
};

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

export async function fetchOutbox(limit = 50): Promise<OutboxRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<OutboxRow>(
    `SELECT msg_id, run_id, channel, status, attempts, created_ts, file_path
     FROM outbox
     ORDER BY created_ts DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
