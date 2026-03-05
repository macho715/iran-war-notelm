"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 30 * 60 * 1000; // 30분

export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
