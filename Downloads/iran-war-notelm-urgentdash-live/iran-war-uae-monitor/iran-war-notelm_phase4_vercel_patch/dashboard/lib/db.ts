import { Pool } from "pg";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

export function getPool(): Pool {
  if (!globalThis.__iranMonitorPgPool) {
    const connectionString = requiredEnv("DATABASE_URL");
    globalThis.__iranMonitorPgPool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return globalThis.__iranMonitorPgPool;
}
