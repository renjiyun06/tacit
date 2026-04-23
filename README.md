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

const category: "billing" | "technical" | "account" = await ai(email);
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
function ai<T = unknown>(...args: unknown[]): Promise<T>;
```

Any number of positional args. All of them get JSON-serialized and sent to the LLM
along with the source code; the LLM reads the call site to know what each one means.

```typescript
const greeting: string                                   = await ai();
const verdict:  "yes" | "no"                             = await ai(question);
const fullName: string                                   = await ai(first, last);
const result:   { ok: boolean; reason: string }          = await ai({ input: data });
```

- The expected return type comes from your TypeScript annotation.
- The runtime returns `unknown`; cast via the annotation (no runtime schema check yet).
- Need to give the LLM a hint? Just pass it as another arg, or write a comment near
  the call site — the LLM will read both.

## Constraints

- **One `ai()` per line** — disambiguation is by line number alone.
- **All args must be JSON-serializable** — functions, Maps, and circular refs throw.
- **Imported types are not resolved** — keep types inline, or trust the LLM's
  knowledge of common libraries (Zod, Date, etc.).
- **Source file must be readable** — does not work from REPL, eval, or compiled
  binaries that strip source.

## Tip: comments are prompts

The LLM sees the **entire source file**, comments included. So when the type alone
is ambiguous, just write a comment near the call site:

```typescript
// urgency scale: 5 = production outage / critical, 1 = trivial cosmetic
const urgency: 1 | 2 | 3 | 4 | 5 = await ai(email);
```

Or even better, use a semantic type so you don't need any explanation:

```typescript
const urgency: "trivial" | "minor" | "moderate" | "high" | "critical" = await ai(email);
```

You don't need a separate "hint" mechanism — the source code IS the prompt, and
comments are part of the source.

## Configuration

None at runtime. The sub-Claude uses your existing user-level config (`~/.claude/`).

## Status

v0 — proof of concept. Works for tiny scripts. Many sharp edges.
