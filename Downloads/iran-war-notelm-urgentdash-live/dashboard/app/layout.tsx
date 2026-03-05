import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import AutoRefresh from "./components/AutoRefresh";

export const metadata = {
  title: "Iran-UAE Monitor Dashboard",
  description: "Runs / Articles / Outbox (SSOT=Postgres)"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <main>
          <AutoRefresh />
          <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>Iran‑UAE Monitor</div>
            <nav style={{ display: "flex", gap: 12, fontSize: 14 }}>
              <Link href="/">Overview</Link>
              <Link href="/runs">Runs</Link>
              <Link href="/articles">Articles</Link>
              <Link href="/outbox">Outbox</Link>
            </nav>
          </header>
          {children}
          <footer style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
            <div>SSOT: Postgres (DATABASE_URL)</div>
            <div>Timezone 기준: Asia/Dubai (runner 저장값)</div>
          </footer>
        </main>
      </body>
    </html>
  );
}
