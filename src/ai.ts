import { readFile } from "node:fs/promises";

interface Callsite {
  file: string;
  line: number;
  column: number;
}

interface AiOpts {
  input?: unknown;
  hint?: string;
}

const DEFAULT_MODEL = "claude-haiku-4-5";

function getCallsite(): Callsite {
  const stack = new Error().stack ?? "";
  const lines = stack.split("\n");

  for (const frameLine of lines) {
    const m = frameLine.match(
      /(?:[\s(])(?:file:\/\/)?(\/[^\s:()]+):(\d+):(\d+)\)?$/,
    );
    if (!m) continue;

    const file = m[1];
    if (file.includes("/tacit/src/") || file.endsWith("/ai.ts")) continue;
    if (file.startsWith("node:") || file.startsWith("bun:")) continue;

    return {
      file,
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
    };
  }
  throw new Error("tacit: could not determine call site from stack trace");
}

function serializeInput(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TypeError(
      `tacit: ai() input must be JSON-serializable. Got error: ${msg}. ` +
        `If you need to pass non-data (functions / Maps / circular refs), ` +
        `convert to a plain object first.`,
    );
  }
}

function numberSource(source: string): string {
  const lines = source.split("\n");
  const width = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(width, " ")} | ${line}`)
    .join("\n");
}

function buildPrompt(args: {
  source: string;
  callLine: number;
  inputJson: string | null;
  hint?: string;
}): string {
  const { source, callLine, inputJson, hint } = args;
  const sourceLine = source.split("\n")[callLine - 1] ?? "";
  const numbered = numberSource(source);

  return [
    "You are being invoked by `tacit`, a TypeScript runtime that fills typed",
    "holes in agent scripts using LLM judgment.",
    "",
    `Your job: read the script below, locate the call site at line ${callLine},`,
    "infer what value should be produced at that point, and output JUST a JSON",
    "value matching the expected type from the type annotation.",
    "",
    "The call site looks like:",
    "    const x: SomeType = await ai({ input: ... });",
    "",
    "You must infer:",
    "  - WHAT to compute — from the variable name, the type annotation, the",
    "    surrounding code, and the agent's overall purpose",
    "  - WHAT SHAPE to return — strictly from the type annotation",
    "",
    "Output exactly one JSON value. No markdown fences. No commentary. No",
    "explanation. The output will be passed directly to JSON.parse().",
    "",
    "---",
    "SCRIPT (full source, with line numbers):",
    "```typescript",
    numbered,
    "```",
    "",
    `CALL SITE: line ${callLine}`,
    "The exact source line is:",
    `    ${sourceLine.trim()}`,
    "",
    inputJson !== null
      ? `INPUT (the value of opts.input, JSON-serialized):\n\`\`\`json\n${inputJson}\n\`\`\``
      : "INPUT: (none)",
    "",
    hint ? `HINT (extra guidance from the agent author):\n${hint}\n` : "",
    "Now output the JSON value (and only the JSON value):",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

function parseOutput(text: string): unknown {
  let stripped = text.trim();

  const fenceMatch = stripped.match(/^```(?:json|javascript|js|ts)?\n([\s\S]*?)\n?```$/);
  if (fenceMatch) stripped = fenceMatch[1].trim();

  try {
    return JSON.parse(stripped);
  } catch {
    const blockMatch = stripped.match(/[\{\[][\s\S]*[\}\]]/);
    if (blockMatch) {
      try {
        return JSON.parse(blockMatch[0]);
      } catch {}
    }
    throw new Error(
      `tacit: claude returned non-JSON output:\n${text.slice(0, 400)}` +
        (text.length > 400 ? "\n... (truncated)" : ""),
    );
  }
}

async function callClaude(prompt: string, model: string): Promise<string> {
  const proc = Bun.spawn(
    [
      "claude",
      "-p",
      "--model",
      model,
      "--tools",
      "",
      "--disable-slash-commands",
      prompt,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(
      `tacit: claude -p exited with code ${exitCode}.\nstderr:\n${stderr}`,
    );
  }
  return stdout.trim();
}

export async function ai<T = unknown>(opts: AiOpts = {}): Promise<T> {
  const callsite = getCallsite();
  const source = await readFile(callsite.file, "utf8");
  const inputJson = opts.input !== undefined ? serializeInput(opts.input) : null;

  const model = process.env.TACIT_MODEL ?? DEFAULT_MODEL;
  const prompt = buildPrompt({
    source,
    callLine: callsite.line,
    inputJson,
    hint: opts.hint,
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callClaude(prompt, model);
      return parseOutput(text) as T;
    } catch (e) {
      lastError = e;
      if (attempt === 1 && e instanceof Error && e.message.includes("non-JSON")) {
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}
