import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";
import { createOutboxRow, countOutboxByRunId, fetchLatestRun, fetchRun } from "../../../../lib/queries";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);
type ExecResult = Awaited<ReturnType<typeof execFileAsync>>;

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
  use_mcp?: boolean;
  dry_run?: boolean;
};

type CommandExecutionError = {
  type: "spawn_error" | "execution_error";
  pythonExecutable: string;
  message: string;
  statusCode?: number;
  stdout?: string;
  stderr?: string;
};

function commandErrorToPayload(err: unknown): CommandExecutionError {
  if (typeof err === "object" && err !== null && "code" in (err as { code?: unknown })) {
    const nodeErr = err as { code?: string; message?: string; path?: string };
    if (nodeErr.code === "ENOENT") {
      return {
        type: "spawn_error",
        pythonExecutable: nodeErr.path || "python",
        message: nodeErr.message || "Python 실행기를 찾을 수 없습니다.",
      };
    }
  }

  if (typeof err === "object" && err !== null && "status" in (err as { status?: unknown })) {
    const nodeErr = err as { status?: number; message?: string; stdout?: string; stderr?: string };
    return {
      type: "execution_error",
      pythonExecutable: "python",
      statusCode: nodeErr.status,
      message: nodeErr.message || "NotebookLM on-demand command execution failed.",
      stdout: nodeErr.stdout,
      stderr: nodeErr.stderr,
    };
  }

  return {
    type: "execution_error",
    pythonExecutable: "python",
    message: err instanceof Error ? err.message : String(err),
  };
}

function parseBool(value: string | boolean | undefined | null, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return ["1", "true", "True", "TRUE", "yes", "YES", "on", "ON"].includes(String(value).trim());
}

async function runNotebooklmScript(script: string, args: string[]): Promise<ExecResult> {
  const candidates: string[] = [];
  const preferred = process.env.PYTHON_BIN?.trim();
  if (preferred) {
    candidates.push(preferred);
  }
  candidates.push("python3", "python");

  for (const candidate of candidates) {
    try {
      return await execFileAsync(candidate, args, {
        encoding: "utf8",
        timeout: 150_000,
        windowsHide: true,
        env: process.env,
      });
    } catch (err) {
      const nodeErr = commandErrorToPayload(err);
      if (nodeErr.type === "spawn_error") {
        const isLast = candidate === candidates[candidates.length - 1];
        if (isLast) {
          throw new Error(`Python 실행기를 찾을 수 없습니다. 시도한 명령어: ${candidates.join(", ")}`);
        }
        continue;
      }
      throw err;
    }
  }

  throw new Error("Python 실행기를 찾을 수 없습니다.");
}

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
      // keep searching for JSON line.
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

function getWorkflowName(): string {
  return process.env.NOTEBOOKLM_REFRESH_WORKFLOW || "notebooklm-refresh.yml";
}

async function dispatchWorkflow(
  action: RefreshRequest["action"],
  runId: string,
  sourceId: string | undefined,
  useMcp: boolean,
  dryRun: boolean,
): Promise<Record<string, unknown>> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_REF_NAME || "main";
  const workflow = getWorkflowName();

  if (!token) {
    throw new Error("GITHUB_TOKEN/ GH_TOKEN 환경변수가 필요합니다.");
  }
  if (!repository || !repository.includes("/")) {
    throw new Error("GITHUB_REPOSITORY(OWNER/REPO) 환경변수가 필요합니다.");
  }

  const inputs: Record<string, string> = {
    action,
    run_id: runId,
    use_mcp: String(useMcp),
    dry_run: String(dryRun),
  };
  if (sourceId) {
    inputs.source_id = sourceId;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`workflow dispatch 실패: ${response.status} ${response.statusText} ${detail}`);
  }

  return {
    type: "workflow_dispatched",
    workflow_name: workflow,
    workflow_ref: `${repository}/.github/workflows/${workflow}`,
    ref,
    run_id: runId,
    source_id: sourceId || null,
    queued: true,
  };
}

async function createRefreshOutbox(
  runId: string,
  action: RefreshRequest["action"],
  sourceId: string | undefined,
  extra: Record<string, unknown>,
): Promise<string> {
  return createOutboxRow({
    msgId: randomUUID(),
    runId,
    channel: "notebooklm_refresh",
    payload: JSON.stringify({ action, source_id: sourceId ?? null, run_id: runId, ...extra }),
    status: "PENDING",
    filePath: null,
    createdTs: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as RefreshRequest | null;
  if (!body || !body.action) {
    return fail(400, "INVALID_REQUEST", "body must include action (report|podcast|slides)");
  }

  if (body.action !== "report" && body.action !== "podcast" && body.action !== "slides") {
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

  const useMcp = parseBool(body.use_mcp, false);
  const dryRun = parseBool(body.dry_run, false);
  const runId = requestedRun.run_id;

  const script = notebooklmScriptPath();
  const shouldRunLocal = existsSync(script) && process.env.NOTEBOOKLM_FORCE_WORKFLOW !== "1" && !process.env.VERCEL;

  const args = [
    script,
    "--action",
    body.action,
    "--run-id",
    runId,
  ];

  if (body.source_id) {
    args.push("--source-id", body.source_id);
  }
  if (useMcp) {
    args.push("--use-mcp");
  }
  if (dryRun) {
    args.push("--dry-run");
  }

  if (shouldRunLocal) {
    try {
      const scriptResult = await runNotebooklmScript(script, args);
      const merged = `${scriptResult.stdout ?? ""}\n${scriptResult.stderr ?? ""}`;
      const parsed = await parseResult(merged);
      if (!parsed) {
        return fail(500, "SCRIPT_OUTPUT_INVALID", "notebooklm_on_demand 결과를 JSON으로 파싱하지 못했습니다.");
      }

      const outboxMsgId = await createRefreshOutbox(
        runId,
        body.action,
        body.source_id,
        parsed
      );
      const outboxCount = await countOutboxByRunId(runId);
      if (!parsed.ok) {
        return fail(500, "SCRIPT_ERROR", String(parsed.error ?? "NotebookLM 실행 실패"));
      }

      const notebookUrl = (parsed.notebook_url as string | undefined) || requestedRun.notebook_url || null;

      return success({
        status: "completed",
        run_id: runId,
        source_id: (parsed.source_id as string | undefined) ?? body.source_id ?? requestedRun.source_id,
        notebook_url: notebookUrl,
        outbox_count: outboxCount,
        outbox_msg_id: outboxMsgId,
        command: parsed.command,
        format: body.format ?? "json",
        message: "요약 재생성 요청이 완료되었습니다.",
      });
    } catch (err) {
      const msg = errMessage(err);
      if (msg.includes("Python 실행기를 찾을 수 없습니다") || msg.includes("python 실행기")) {
        // fallback to workflow dispatch in constrained envs
        const workflow = await dispatchWorkflow(body.action, runId, body.source_id, useMcp, dryRun);
        const outboxMsgId = await createRefreshOutbox(runId, body.action, body.source_id, workflow);
        const outboxCount = await countOutboxByRunId(runId);
        return success({
          status: "queued",
          run_id: runId,
          source_id: body.source_id ?? requestedRun.source_id,
          notebook_url: requestedRun.notebook_url || null,
          outbox_count: outboxCount,
          outbox_msg_id: outboxMsgId,
          workflow_dispatch: workflow,
          message: "Python 실행기를 찾지 못해 GitHub Actions로 큐잉했습니다.",
        });
      }
      return fail(500, "SCRIPT_EXEC_ERROR", `NotebookLM 재생성 실행 실패: ${msg}`);
    }
  }

  try {
    const workflow = await dispatchWorkflow(body.action, runId, body.source_id, useMcp, dryRun);
    const outboxMsgId = await createRefreshOutbox(runId, body.action, body.source_id, workflow);
    const outboxCount = await countOutboxByRunId(runId);
    return success({
      status: "queued",
      run_id: runId,
      source_id: body.source_id ?? requestedRun.source_id,
      notebook_url: requestedRun.notebook_url || null,
      outbox_count: outboxCount,
      outbox_msg_id: outboxMsgId,
      workflow_dispatch: workflow,
      message: "요약 재생성 요청을 큐에 등록했습니다.",
    });
  } catch (err) {
    const msg = errMessage(err);
    return fail(500, "WORKFLOW_DISPATCH_ERROR", `NotebookLM 재생성 큐잉 실패: ${msg}`);
  }
}
