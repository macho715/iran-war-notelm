import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";
import { countOutboxByRunId, fetchLatestRun, fetchRun } from "../../../../lib/queries";

const execFileAsync = promisify(execFile);

function errMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

type RefreshRequest = {
  run_id?: string;
  source_id?: string;
  action: "report" | "podcast" | "slides";
  format?: "json" | "markdown";
};

function fail(status: number, errorCode: string, message: string): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error_code: errorCode,
      message,
    },
    { status }
  );
}

function success(payload: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      error_code: null,
      ...payload,
    },
    { status: 200 }
  );
}

async function parseResult(raw: string): Promise<Record<string, unknown> | null> {
  const lines = raw.trim().split("\n").reverse();
  for (const line of lines) {
    if (!line.trim().startsWith("{")) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // keep searching
    }
  }
  return null;
}

function notebooklmScriptPath(): string {
  const base = process.cwd();
  const candidate = path.join(base, "..", "scripts", "notebooklm_on_demand.py");
  if (existsSync(candidate)) {
    return candidate;
  }
  return path.join(base, "scripts", "notebooklm_on_demand.py");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as RefreshRequest | null;
  if (!body || !body.action) {
    return fail(400, "INVALID_REQUEST", "body must include action (report|podcast|slides)");
  }

  const action = body.action;
  if (action !== "report" && action !== "podcast" && action !== "slides") {
    return fail(400, "INVALID_ACTION", "action must be report, podcast, or slides");
  }

  const requestedRun = body.run_id ? await fetchRun(body.run_id) : await fetchLatestRun();
  if (!requestedRun) {
    return fail(
      404,
      "RUN_NOT_FOUND",
      "run_id를 찾을 수 없습니다. 최신 run이 없으면 먼저 main pipeline을 실행하세요."
    );
  }

  const script = notebooklmScriptPath();
  const python = process.env.PYTHON_BIN || "python";

  const args = [
    script,
    "--action",
    action,
    "--run-id",
    requestedRun.run_id,
  ];

  if (body.source_id) {
    args.push("--source-id", body.source_id);
  }

  try {
    const scriptResult = await execFileAsync(python, args, {
      encoding: "utf8",
      timeout: 150_000,
      windowsHide: true,
      env: process.env,
    });

    const merged = `${scriptResult.stdout ?? ""}\n${scriptResult.stderr ?? ""}`;
    const parsed = await parseResult(merged);
    if (!parsed) {
      return fail(500, "SCRIPT_OUTPUT_INVALID", "notebooklm_on_demand 결과를 JSON으로 파싱하지 못했습니다.");
    }

    if (!parsed.ok) {
      const msg = String(parsed.error ?? "NotebookLM 실행 실패");
      return fail(500, "SCRIPT_ERROR", msg);
    }

    const outboxCount = await countOutboxByRunId(requestedRun.run_id);
    const notebookUrl =
      (parsed.notebook_url as string | undefined) || requestedRun.notebook_url || null;

    return success({
      status: "queued",
      run_id: requestedRun.run_id,
      source_id: parsed.source_id ?? body.source_id ?? requestedRun.source_id,
      notebook_url: notebookUrl,
      outbox_count: outboxCount,
      command: parsed.command,
      format: body.format ?? "json",
      message: "요약 재생성 요청을 정상 접수했습니다.",
    });
  } catch (err) {
    const msg = errMessage(err);
    return fail(500, "SCRIPT_EXEC_ERROR", `NotebookLM 재생성 실행 실패: ${msg}`);
  }
}
