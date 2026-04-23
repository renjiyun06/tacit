#!/usr/bin/env bun
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HELP = `\
tacit — TypeScript runtime for tiny LLM-driven agent scripts.

Usage:
  tacit run <script.ts> [args...]    Run an agent script
  tacit --help                        Show this help
  tacit --version                     Show version

Examples:
  tacit run my-agent.ts
  ./my-agent.ts                       (with shebang: #!/usr/bin/env tacit)

Inside the script, import the runtime:

  import { ai } from "tacit";

  const greeting: string = await ai({ input: "say hi to Ren" });
  console.log(greeting);
`;

function tacitRoot(): string {
  // CLI lives at <root>/src/cli.ts; root is two ups from this file
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
  // Make `import { ai } from "tacit"` resolve to our package.
  // Strategy: prepend our parent dir to NODE_PATH so node module resolution
  // finds the "tacit" directory there. Works for both global install
  // (~/.bun/install/global/node_modules/tacit) and local dev (forge-ai/tacit).
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const pkgPath = resolve(tacitRoot(), "package.json");
    const pkg = JSON.parse(await Bun.file(pkgPath).text());
    console.log(`tacit ${pkg.version}`);
    process.exit(0);
  }

  if (args[0] === "run") {
    if (args.length < 2) {
      console.error("tacit: missing script path. Usage: tacit run <script.ts>");
      process.exit(1);
    }
    await runScript(args[1], args.slice(2));
    return;
  }

  // Shebang form: `#!/usr/bin/env tacit` followed by `./script.ts arg1 arg2`
  // means argv is [tacit, ./script.ts, arg1, arg2]. We treat any first arg
  // ending in .ts/.tsx/.mts/.cts as a script to run.
  if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/i.test(args[0])) {
    await runScript(args[0], args.slice(1));
    return;
  }

  console.error(`tacit: unknown command: ${args[0]}`);
  console.error(HELP);
  process.exit(1);
}

main().catch((e) => {
  console.error("tacit:", e instanceof Error ? e.message : e);
  process.exit(1);
});
