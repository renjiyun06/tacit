#!/usr/bin/env bun
import cac from "cac";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `\
tacit — TypeScript runtime for tiny agent-driven scripts.

Usage:
  tacit run <script.ts> [args...]     Run a tacit script
  tacit --help                        Show this help
  tacit --version                     Show version
`;

function tacitRoot(): string {
  // CLI lives at <root>/src/cli.ts; root is two ups from this file.
  const here = fileURLToPath(import.meta.url);
  return resolve(dirname(here), "..");
}

async function runScript(scriptPath: string, scriptArgs: string[]): Promise<never> {
  const absolute = resolve(scriptPath);
  if (!existsSync(absolute)) {
    console.error(`tacit: script not found: ${absolute}`);
    process.exit(1);
  }

  const root = tacitRoot();
  // Make `import { agent } from "tacit"` resolve to our package.
  // Strategy: prepend our parent dir to NODE_PATH so node module resolution
  // finds the "tacit" directory there. Works for both global install
  // (~/.bun/install/global/node_modules/tacit) and local dev.
  const nodeModulesParent = resolve(root, "..");

  const proc = Bun.spawn(["bun", absolute, ...scriptArgs], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      NODE_PATH: process.env.NODE_PATH
        ? `${nodeModulesParent}:${process.env.NODE_PATH}`
        : nodeModulesParent,
    },
  });

  const code = await proc.exited;
  process.exit(code ?? 0);
}

const pkg = JSON.parse(readFileSync(resolve(tacitRoot(), "package.json"), "utf8"));
const cli = cac("tacit");

// Forwarding script args needs the raw argv: cac strips --flags out of its
// `args` parameter (treating them as options), so we re-derive everything
// after the script path directly from process.argv.
function rawArgsAfter(token: string): string[] {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(token);
  return i === -1 ? [] : argv.slice(i + 1);
}

cli
  .command("run <script>", "run a tacit script")
  .allowUnknownOptions()
  .action((script: string) => runScript(script, rawArgsAfter(script)));

// Default — handles the shebang form `./script.ts ...` (where the kernel
// passes argv as [tacit, ./script.ts, ...]) and any unknown first arg.
cli
  .command("[script]", "run a tacit script (shebang form)")
  .allowUnknownOptions()
  .action((script: string | undefined) => {
    if (!script) {
      console.log(HELP);
      process.exit(1);
    }
    if (!/\.(ts|tsx|mts|cts|js|mjs|cjs)$/i.test(script)) {
      console.error(`tacit: unknown command: ${script}`);
      console.error(HELP);
      process.exit(1);
    }
    return runScript(script, rawArgsAfter(script));
  });

cli.help(() => [{ body: HELP }]);
cli.version(pkg.version);

try {
  cli.parse();
} catch (e) {
  console.error("tacit:", e instanceof Error ? e.message : e);
  process.exit(1);
}
