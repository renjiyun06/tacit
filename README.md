# tacit

> TypeScript runtime for tiny LLM-driven agent scripts. The type **is** the prompt.

`tacit` lets you write a single-file TypeScript "agent" with `await ai({ input })`
calls scattered through it. The runtime reads your full source file and the call
site's line, sends it all to Claude, and returns a JSON value matching your
TypeScript type annotation.

**You write no prompts.** The type annotation, variable name, and surrounding code
carry the intent.

## Quick start

```bash
bun install -g tacit                       # one-time global install
```

Write an agent (anywhere on disk):

```typescript
#!/usr/bin/env tacit
import { ai } from "tacit";

const email = "Hi, I was charged twice for last month's subscription. Please refund.";

const category: "billing" | "technical" | "account" = await ai({ input: email });
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

Each `await ai({ input })` call:

1. Captures `file:line` from `new Error().stack`
2. Reads the full source file
3. Spawns `claude -p "<prompt>"` with `cwd = $HOME` (so the sub-Claude inherits
   only your user-level settings, never anything project-specific from wherever
   you happened to invoke `tacit`)
4. Parses the response with `JSON.parse` (with a simple fence-stripping fallback)

No API key needed — `tacit` uses your existing `claude` CLI auth.

The model, tools, and skills are whatever your user-level Claude config says they
should be. `tacit` does not override them.

## API

```typescript
function ai<T = unknown>(opts?: {
  input?: unknown;   // any JSON-serializable value passed to the LLM as runtime context
  hint?: string;     // optional extra guidance for ambiguous cases
}): Promise<T>;
```

- The expected return type comes from your TypeScript annotation.
- The runtime returns `unknown`; cast via the annotation (no runtime schema check yet).

## Constraints

- **One `ai()` per line** — disambiguation is by line number alone.
- **`input` must be JSON-serializable** — functions, Maps, and circular refs throw.
- **Imported types are not resolved** — keep types inline, or trust the LLM's
  knowledge of common libraries (Zod, Date, etc.).
- **Source file must be readable** — does not work from REPL, eval, or compiled
  binaries that strip source.

## When to use `hint`

When the type alone is ambiguous:

```typescript
// LLM doesn't know which direction is "more urgent"
const urgency: 1 | 2 | 3 | 4 | 5 = await ai({
  input: email,
  hint: "5 = production down, 1 = trivial cosmetic",
});
```

Better: use a more semantic type:

```typescript
const urgency: "trivial" | "minor" | "moderate" | "high" | "critical" = await ai({
  input: email,
});
```

## Configuration

None at runtime. The sub-Claude uses your existing user-level config (`~/.claude/`).

## Status

v0 — proof of concept. Works for tiny scripts. Many sharp edges.
