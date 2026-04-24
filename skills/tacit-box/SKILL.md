---
name: tacit-box
description: Use when the user wants a small LLM-assisted CLI tool, aide, or automation — typical cases include classification, extraction, scoring, routing, summarization, natural-language guards, conditional cron jobs, or dirty-data-to-structured adapters. Before writing any new code, you MUST first check whether a suitable script already exists in ~/tacit/ by running `tacit-box list` or `tacit-box search <query>`. Only if no existing script fits should you write a new tacit script following the conventions below.
---

# tacit-box

A tacit script is **a tiny CLI tool with one or two LLM-judgment holes drilled into it**. Single-file TypeScript, typically 30-50 lines, lives in `~/tacit/`, runs as a standalone command.

The design philosophy is **restraint**: a tacit script is 95% deterministic code. `ai()` is called only at points where the judgment needed genuinely cannot be expressed in plain code. This is not an "autonomous agent" framework — it is a **knob-style** design. The author explicitly chooses where judgment is handed over to the LLM and where it is not.

## Discovery: check before writing

When the user asks for something that could be solved by a tacit script, **the first action is to check, not to write**:

```bash
tacit-box list                     # list all existing scripts with one-line descriptions
tacit-box search "<user intent>"   # semantic search (ai()-driven, not string match)
```

`search` is not string matching — it understands intent and finds functionally related scripts even when names contain no matching keyword. Prefer `search` over `list` when the user's need can be phrased as a goal.

After finding candidate scripts, inspect them with `<script-name> --help`. Only if you are confident that **no existing script does this** should you proceed to write a new one. **Prefer modifying an existing script over creating a new one.**

## When tacit is a good fit

- Small tools with an LLM judgment step: classification, extraction, scoring, routing, summarization, natural-language guards
- Adapters from dirty input (emails, webhooks, HTML, logs) to structured data
- Conditional cron: the LLM decides *whether something is worth doing*; plain code does the action
- One-shot extraction / translation tasks meant to be written, used, and discarded
- Introspection tasks: scanning git log / todos / activity logs for summaries or recommendations

## When tacit is NOT a good fit

- Latency-sensitive work (each `ai()` call has 5-12s cold-start)
- Tight loops (`for (let i = 0; i < 1000; i++) await ai(...)` — don't)
- Inputs that cannot be JSON-serialized (functions, Maps, Buffers, circular refs) — tacit will throw
- Purely deterministic tasks (write plain TS; don't summon an LLM just because)
- Flows larger than ~100 lines (either split, or reconsider whether tacit is the right tool)

When the task is not a fit, **do not force it into a tacit script**. Tell the user directly and suggest an alternative (plain script, proper library, or dropping automation).

## Running scripts

All tacit scripts run via shebang. There is **no** `node`, `bun`, or other runtime prefix:

```bash
tacit-xxx                         # ~/tacit/ is on PATH, scripts are direct commands
tacit-xxx --description           # one-line description
tacit-xxx --help                  # detailed usage
tacit-xxx [script-specific args]  # do the actual work
```

## Conventions for new scripts

### Location and naming

- **File location**: `~/tacit/<name>.ts`
- **Name prefix**: must start with `tacit-`, kebab-case, verb or noun phrase:
  - ✅ `tacit-trending-report.ts`, `tacit-todo-nag.ts`, `tacit-git-week.ts`
  - ❌ `trending.ts` (no prefix), `TacitReport.ts` (wrong case), `report.ts` (namespace pollution)
- **Permissions**: `chmod +x` so it runs as a command

### Uniform CLI contract (every script must support this)

- `--description` flag → print one short line (consumed by `tacit-box list`)
- `--help` flag → print detailed usage (for humans)
- No flag, or only business-relevant flags → do the actual work

**Rules**: `--description` must be **exactly one line**, terse. `--help` may be multi-line with examples. Both are non-negotiable parts of the contract.

### tacit's own hard constraints

- **One `ai()` call per line** — tacit locates call sites by line number
- **All `ai()` args must be JSON-serializable** — passing functions / Maps / circular refs will throw
- **Imported types are not resolved** — complex types must be declared inline in the script itself

### Standard template

```typescript
#!/usr/bin/env tacit
import { ai } from "tacit";

const DESCRIPTION = "One short line describing what this script does (tacit-box list reads this)";

const HELP = `tacit-xxx: <one-sentence purpose>

Usage:
  tacit-xxx [args]

Examples:
  tacit-xxx foo
  tacit-xxx --help

Optional background / caveats go here.
`;

// —— Standard flag handling (every script starts this way) ——
const args = process.argv.slice(2);
if (args.includes("--description")) {
  console.log(DESCRIPTION);
  process.exit(0);
}
if (args.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}

// —— Actual work starts here ——

// Deterministic steps: plain TypeScript
const rawData = /* fetch data, read files, curl, etc. */;

// Judgment point: place an ai() where plain code cannot express the decision.
// The type, variable name, and surrounding comments ARE the prompt — do NOT
// write extra natural-language instructions to the LLM.
type OutputShape = { /* declare fields and optionality precisely */ };
const result: OutputShape = await ai(rawData);

// Delivery: write a file, post to a channel, print to stdout
console.log(JSON.stringify(result, null, 2));
```

## Writing taste

Internalize the following — these separate tacit scripts from "throwaway scripts that happen to call an LLM":

**1. Use `ai()` sparingly.** If plain code can do it, plain code does it. Every `ai()` call should be a **deliberate handover**, chosen because the judgment on that line genuinely cannot be expressed otherwise. Do not reach for `ai()` just because the LLM is already in play.

**2. Types are the spec, not a hint.** To get a specific output field, put it in the TypeScript type, not in a comment describing it. The type is a **physical contract**; prose is a suggestion. Prefer the contract.

**3. Pass paths, not contents — when appropriate.**

- Small / clearly-structured data → `JSON.stringify` it into an `ai()` argument
- Large / unstructured data (files, directories, URLs) → pass only the path or URL and let the sub-Claude use Read/Grep/curl to fetch what it needs. This is **progressive disclosure**: the agent decides at call time how deep to dig, rather than the script author deciding up front.

**4. Comments are prompts too.** The LLM sees the entire source. When the type alone cannot carry the full meaning, a short explanatory comment (e.g. `// urgency: 5 = critical outage, 1 = trivial cosmetic`) is better than contorting type names to squeeze the semantics in.

**5. Keep scripts short.** Anything past ~100 lines should prompt self-examination. Is this actually a tacit-sized task? Should it be split into two scripts piped together?

**6. One script, one job.** tacit scripts are unix small-tool style, not applications. If you find yourself adding a third "mode" (`--mode=a/b/c`), the script should probably be split into three.

## `tacit-box` is itself a tacit script

`tacit-box` lives at `~/tacit/tacit-box.ts` and obeys every rule above (prefix, `--description`, `--help`, `chmod +x`, shebang). Its `search` subcommand uses `ai()` to do semantic matching — that is the self-hosted part of the system.

This means the entire system contains **one kind of thing: tacit scripts**. There is no "framework vs. user code" split. `tacit-box list` includes `tacit-box` itself in its output; `tacit-box search` can match its own description. This is by design, not an oversight.
