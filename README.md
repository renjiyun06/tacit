# tacit

> TypeScript runtime for tiny agent-driven scripts. The source **is** the prompt.

`tacit` lets you write a single-file TypeScript "agent" with `await agent.<verb>(...)`
calls scattered through it. The runtime reads your full source file and the call
site's line, sends it all to Claude, and returns a JSON value matching your
TypeScript type annotation.

**You write no prompts.** The verb (`classify`, `extract`, `score`, …), the type
annotation, the variable name, and the surrounding code together carry the intent.

## Quick start

```bash
bun install -g tacit                       # one-time global install
```

Write an agent (anywhere on disk):

```typescript
#!/usr/bin/env tacit
import { agent } from "tacit";

const email = "Hi, I was charged twice for last month's subscription. Please refund.";

const category: "billing" | "technical" | "account" = await agent.classify(email);
console.log(category);
```

Run it:

```bash
chmod +x my-agent.ts
./my-agent.ts                              # via shebang
# or
tacit run my-agent.ts                      # via CLI
```

Output: `billing`

## How it works

Each `await agent.<verb>(...)` call:

1. Captures `file:line` from `new Error().stack`
2. Reads the full source file
3. Spawns `claude -p "<prompt>"` with `cwd = $HOME` (so the sub-agent inherits
   only your user-level settings, never anything project-specific from wherever
   you happened to invoke `tacit`)
4. Parses the response with `JSON.parse` (with a simple fence-stripping fallback)

No API key needed — `tacit` uses your existing `claude` CLI auth.

The model, tools, and skills are whatever your user-level Claude config says they
should be. `tacit` does not override them.

## API

```typescript
import { agent } from "tacit";

// `agent` is a Proxy. Any property name returns a callable function.
agent.<verb><T = unknown>(...args: unknown[]): Promise<T>;
```

`agent` accepts **any verb** as a method name. The library does not enforce or
maintain a list — the verb is just one more signal the agent reads from the source.
Pick the one that reads best at the call site:

```typescript
const greeting: string                                = await agent.greet();
const verdict:  "yes" | "no"                          = await agent.judge(question);
const fullName: string                                = await agent.combine(first, last);
const result:   { ok: boolean; reason: string }       = await agent.check({ input: data });
```

- The expected return type comes from your TypeScript annotation.
- The runtime returns `unknown`; cast via the annotation (no runtime schema check yet).
- All positional args are JSON-serialized and sent to the agent.
- Need to give the agent a hint? Pick a more descriptive verb, pass another arg,
  or write a comment near the call site — the agent will read all of them.

## Constraints

- **One `agent.<verb>()` per line** — disambiguation is by line number alone.
- **All args must be JSON-serializable** — functions, Maps, and circular refs throw.
- **Imported types are not resolved** — keep types inline, or trust the agent's
  knowledge of common libraries (Zod, Date, etc.).
- **Source file must be readable** — does not work from REPL, eval, or compiled
  binaries that strip source.

## Tip: comments are prompts

The agent sees the **entire source file**, comments included. So when the verb +
type alone is ambiguous, just write a comment near the call site:

```typescript
// urgency scale: 5 = production outage / critical, 1 = trivial cosmetic
const urgency: 1 | 2 | 3 | 4 | 5 = await agent.score(email);
```

Or even better, use a semantic type so you don't need any explanation:

```typescript
const urgency: "trivial" | "minor" | "moderate" | "high" | "critical" = await agent.score(email);
```

You don't need a separate "hint" mechanism — the source code IS the prompt, and
verbs / variable names / comments are all part of the source.

## Configuration

None at runtime. The sub-agent uses your existing user-level config (`~/.claude/`).

## Status

v0 — proof of concept. Works for tiny scripts. Many sharp edges.
