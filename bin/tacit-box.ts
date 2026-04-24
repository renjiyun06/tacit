#!/usr/bin/env tacit
import { ai } from "tacit";
import { readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const DESCRIPTION = "List and semantically search tacit scripts in ~/tacit/";

const HELP = `tacit-box — the entry point for managing tacit scripts

Usage:
  tacit-box.ts list                  List all tacit scripts with one-line descriptions
  tacit-box.ts search <query>        Semantic search (ai()-driven) for scripts matching <query>
  tacit-box.ts --description         Print one-line description of tacit-box itself
  tacit-box.ts --help                This message

Notes:
  Scripts live in ~/tacit/ and follow the tacit-box conventions:
    - file name matches  tacit-<kebab-name>.ts
    - supports --description (one line) and --help (detailed)
    - executable (chmod +x) with shebang  #!/usr/bin/env tacit

  To inspect a specific script, run:
    <script> --help
`;

const TACIT_DIR = join(homedir(), "tacit");

// ── helpers ─────────────────────────────────────────────────────────

function listScriptFiles(): string[] {
  if (!existsSync(TACIT_DIR)) return [];
  return readdirSync(TACIT_DIR)
    .filter((f) => f.startsWith("tacit-") && f.endsWith(".ts"))
    .sort();
}

function getDescription(fileName: string): string {
  const result = spawnSync(join(TACIT_DIR, fileName), ["--description"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (result.status !== 0 || !result.stdout) return "(no --description)";
  return result.stdout.trim().split("\n")[0];
}

function commandNameOf(fileName: string): string {
  return fileName;  // keep .ts so the printed name is directly runnable
}

type ScriptEntry = { command: string; description: string };

function collectScripts(): ScriptEntry[] {
  return listScriptFiles().map((f) => ({
    command: commandNameOf(f),
    description: getDescription(f),
  }));
}

// ── flag handling ───────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--description")) {
  console.log(DESCRIPTION);
  process.exit(0);
}
if (args.includes("--help") || args.length === 0) {
  console.log(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}

const subcommand = args[0];

// ── list ────────────────────────────────────────────────────────────

if (subcommand === "list") {
  const scripts = collectScripts();
  if (scripts.length === 0) {
    console.log(`(no tacit scripts in ${TACIT_DIR})`);
    process.exit(0);
  }
  const maxName = Math.max(...scripts.map((s) => s.command.length));
  for (const s of scripts) {
    console.log(`${s.command.padEnd(maxName)}   ${s.description}`);
  }
  process.exit(0);
}

// ── search ──────────────────────────────────────────────────────────

if (subcommand === "search") {
  const query = args.slice(1).join(" ").trim();
  if (!query) {
    console.error("Usage: tacit-box.ts search <query>");
    process.exit(1);
  }

  const scripts = collectScripts();
  if (scripts.length === 0) {
    console.log(`(no tacit scripts in ${TACIT_DIR} to search)`);
    process.exit(0);
  }

  // Semantic match: decide which scripts could plausibly satisfy the query
  // based on their command name and description. Not string match — the LLM
  // should match on *intent*. Return [] if nothing is actually relevant;
  // do not force matches that don't fit. Order by relevance (best first).
  type SearchResult = {
    matches: Array<{
      command: string;
      reason: string;  // one short sentence: why this script fits the query
    }>;
  };

  const result: SearchResult = await ai({ query, scripts });

  if (result.matches.length === 0) {
    console.log(`No existing tacit script seems to fit: "${query}"`);
    console.log(`(If none of the listed scripts apply, a new one may be warranted.)`);
    process.exit(0);
  }

  for (const m of result.matches) {
    console.log(m.command);
    console.log(`  ${m.reason}`);
    console.log();
  }
  process.exit(0);
}

console.error(`tacit-box: unknown subcommand: ${subcommand}`);
console.error();
console.error(HELP);
process.exit(1);
