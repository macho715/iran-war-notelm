import { NextRequest, NextResponse } from "next/server";
import { fetchOutboxMsg, updateOutboxStatus } from "../../../../lib/queries";

const TELEGRAM_MAX_LEN = 4096;
const TELEGRAM_CHANNEL = "telegram";

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split(/(?<=\n)/);
  let current = "";
  for (const line of lines) {
    if (line.length > TELEGRAM_MAX_LEN) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < line.length; i += TELEGRAM_MAX_LEN) {
        chunks.push(line.slice(i, i + TELEGRAM_MAX_LEN));
      }
      continue;
    }
    if (current.length + line.length > TELEGRAM_MAX_LEN) {
      chunks.push(current);
      current = line;
    } else {
      current += line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendToTelegram(token: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  if (!res.ok) {
    // Fallback: plain text
    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res2.ok) {
      const body = await res2.text();
      throw new Error(`Telegram API error: ${res2.status} ${body}`);
    }
  }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정" },
      { status: 500 }
    );
  }

  let msgId: string;
  try {
    const body = await req.json();
    msgId = body?.msg_id;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!msgId) {
    return NextResponse.json({ ok: false, error: "msg_id 필요" }, { status: 400 });
  }

  let row;
  try {
    row = await fetchOutboxMsg(msgId);
  } catch (err) {
    const msg = errMessage(err);
    return NextResponse.json({ ok: false, error: `Outbox 조회 실패: ${msg}` }, { status: 502 });
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: "msg_id 없음" }, { status: 404 });
  }

  if (row.channel !== TELEGRAM_CHANNEL) {
    return NextResponse.json(
      { ok: false, error: `channel이 telegram이 아님: ${row.channel}` },
      { status: 400 }
    );
  }

  try {
    const chunks = chunkText(row.payload);
    for (const chunk of chunks) {
      await sendToTelegram(token, chatId, chunk);
    }
    try {
      await updateOutboxStatus(msgId, "SENT", null);
    } catch (err) {
      const msg = errMessage(err);
      return NextResponse.json({ ok: false, error: `전송 성공했지만 상태 업데이트 실패: ${msg}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = errMessage(err);
    try {
      await updateOutboxStatus(msgId, "FAILED", msg);
    } catch {
      // Preserve original send failure as response even if DB update also fails.
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
