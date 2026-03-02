import type { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __iranMonitorPgPool: Pool | undefined;
}

export {};
