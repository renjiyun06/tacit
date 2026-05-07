#!/usr/bin/env bun
import cac from "cac";

const PRINCIPLES = `tacit — TypeScript runtime for tiny agent-driven scripts.

## Core idea: the source IS the prompt

\`await agent.<verb>(...)\` hands off to an agent. The agent is given the FULL
source of your script — not just the call line — and produces a JSON value
that matches your TypeScript type annotation at that call site.

Because the agent sees the whole file, you write NO prompt strings. Every
element of the source carries intent — the type is just one signal among
several:

  - the verb (\`classify\` / \`extract\` / \`score\` / \`summarize\` / \`parse\` /
    anything you choose) — what kind of operation this is
  - type annotation     — output shape (the formal contract)
  - variable name       — what the value IS
  - nearby comments     — semantics the type/verb can't capture
  - surrounding code    — context (what was just done; what happens next)
  - the file as a whole — the script's overall purpose

    // urgency: 5 = production outage / critical, 1 = trivial cosmetic
    const urgency: 1 | 2 | 3 | 4 | 5 = await agent.score(email);
    //    ^^^^^^^  ^^^^^^^^^^^^^^^^^         ^^^^^
    //    name      shape                     verb
    //
    // Verb says "score". Type narrows output to 5 integers. Variable name
    // supplies the axis ("urgency"). Comment fills in the direction (which
    // end is critical). The whole file tells the agent this is email triage.
    // Together = full spec, no explicit prompt needed.

## The agent namespace

\`agent\` accepts ANY property name as a verb — \`agent.classify\`,
\`agent.extract\`, \`agent.summarize\`, \`agent.parse\`, \`agent.judge\`, or
anything else you choose. There is no fixed list. Pick the verb that reads
best at the call site; the agent sees it as one more signal.

    await agent.classify(email);     // valid
    await agent.summarize(article);  // valid
    await agent.score(input);        // valid
    await agent.totallyMadeUpVerb(); // also valid (no compile error)

## Design philosophy: restraint

A tacit script is 95% deterministic code. \`agent.<verb>()\` is invoked only
at points where the judgment needed genuinely cannot be expressed in plain
code. This is not an "autonomous agent" framework — it is a knob-style
design. The author explicitly chooses where judgment is handed over to the
agent and where it is not.

## Writing a tacit script

The **entry-point file** (the one you invoke) must follow this skeleton.
You're free to \`import\` helpers from other files — normal TypeScript
imports work as expected.

    #!/usr/bin/env tacit
    import { agent } from "tacit";

    // ... your code, including any await agent.<verb>(...) calls ...
    const out: SomeType = await agent.<verb>(input);

The four essentials:

  - \`#!/usr/bin/env tacit\` — shebang; makes the file run via tacit
  - \`import { agent } from "tacit";\` — bring in the namespace
  - inline TypeScript type annotation on each result variable — the output shape
  - the verb at \`agent.<verb>(...)\` — names the operation

There is no config file, no decorators, no separate prompt strings.

## Hard runtime constraints

- One \`agent.<verb>()\` call per line — tacit locates call sites by line
  number.
- All \`agent.<verb>()\` args must be JSON-serializable — passing functions
  / Maps / circular refs will throw.
- Imported types are not resolved — complex types must be declared inline
  in the script itself.

## Running a tacit script

    chmod +x my-script.ts
    ./my-script.ts                  # via shebang
    tacit run my-script.ts          # via CLI

## See also

    tacit-skill examples            # 3 canonical patterns to copy from
    tacit-skill taste               # 6 rules for writing good tacit scripts`;

const TASTE = `# Writing taste — 6 rules

These separate tacit scripts from "throwaway scripts that happen to call an
agent". Internalize them before writing.

## 1. Use \`agent.<verb>()\` sparingly

If plain code can do it, plain code does it. Every \`agent.<verb>()\` call
should be a deliberate handover, chosen because the judgment on that line
genuinely cannot be expressed otherwise. Do not reach for \`agent.<verb>()\`
just because tacit makes it easy.

## 2. Pick a verb that names the operation

The verb is part of the prompt. Choose one that an unfamiliar reader (and
the agent) would interpret unambiguously: \`classify\`, \`extract\`, \`score\`,
\`route\`, \`summarize\`, \`triage\`, \`parse\`, \`check\`, \`rewrite\`, \`translate\`.

Avoid lazy verbs (\`run\`, \`do\`, \`call\`) — they leak no information. Avoid
overloaded ones (\`get\`, \`process\`, \`handle\`) — they could mean anything.

    // BAD: verb adds no signal beyond "use the agent"
    const category = await agent.run(email);

    // GOOD: verb states the operation; agent and reader both benefit
    const category: "billing" | "technical" | "account" = await agent.classify(email);

## 3. Types are the spec, not a hint

To get a specific output field, put it in the TypeScript type, not in a
comment describing it. The type is a physical contract; prose is a
suggestion. Prefer the contract.

    // BAD: the comment says what you want; the type doesn't enforce it
    // returns { name, age, email }
    const person: object = await agent.extract(rawText);

    // GOOD: the contract IS the spec
    const person: { name: string; age: number; email: string } = await agent.extract(rawText);

## 4. Pass paths, not contents — when appropriate

- Small / clearly-structured data → \`JSON.stringify\` it into an
  \`agent.<verb>()\` argument.
- Large / unstructured data (files, directories, URLs) → pass only the
  path or URL and let the sub-agent use Read / Grep / curl to fetch what
  it needs. This is progressive disclosure: the sub-agent decides at call
  time how deep to dig, rather than the script author deciding up front.

## 5. Comments are prompts too

The agent sees the entire source. When type + verb together cannot carry the
full meaning, a short explanatory comment is better than contorting type
names or verb choice to squeeze the semantics in.

    // urgency scale: 5 = production outage / critical, 1 = trivial cosmetic
    const urgency: 1 | 2 | 3 | 4 | 5 = await agent.score(email);

## 6. Keep scripts short, one job per script

Anything past ~100 lines should prompt self-examination. Is this actually a
tacit-sized task? Should it be split into two scripts piped together?

Tacit scripts are unix small-tool style, not applications. If you find
yourself adding a third "mode" (\`--mode=a/b/c\`), the script should
probably be split into three.`;

const EXAMPLES = `# Canonical examples — 3 patterns to copy from

## Pattern 1: literal union as a classifier (the minimal case)

The simplest tacit script. The verb (\`classify\`) + the literal-union type
together ARE the entire spec: the agent sees the verb, sees which strings are
valid outputs, and produces one of them.

    #!/usr/bin/env tacit
    import { agent } from "tacit";

    const email = "Hi, I was charged twice for last month's subscription. Please refund.";

    const category: "billing" | "technical" | "account" = await agent.classify(email);

    console.log(\`category: \${category}\`);

When to copy this: any time the output is a small fixed set of choices
(category, sentiment, route label, severity bucket).

## Pattern 2: structured object as the contract

For richer outputs, use an inline object type. Each field's name and type
carries intent. The verb (\`triage\`, \`extract\`, \`summarize\`, etc.) names the
overall operation.

    #!/usr/bin/env tacit
    import { agent } from "tacit";

    const email = "PRODUCTION DOWN! Our checkout integration is throwing 500s, customers can't pay!";

    const triage: {
      category: "billing" | "technical" | "account" | "other";
      urgency:  1 | 2 | 3 | 4 | 5;
      reason:   string;
    } = await agent.triage({ input: email });

    console.log(JSON.stringify(triage, null, 2));

When to copy this: extraction / structuring tasks where you need multiple
related fields out of one input. Keep the type declaration inline — tacit
does not resolve imported types.

## Pattern 3: progressive disclosure (pass a path, not the contents)

Don't read large / unstructured data yourself and stuff it into the prompt.
Hand the sub-agent a path or URL — it has full tool access (Read / Grep /
Glob / Bash / curl) and decides at call time how much to load.

    #!/usr/bin/env tacit
    import { agent } from "tacit";

    // Use the Read tool to load the README at the path below, then return a
    // structured summary. Read only the first ~150 lines if it's large.

    const summary: {
      one_line_pitch:    string;
      primary_use_cases: string[];
      hard_constraints:  string[];
      install_command:   string;
    } = await agent.summarize("/path/to/README.md");

    console.log(JSON.stringify(summary, null, 2));

When to copy this: inputs are files / directories / URLs / anything bigger
than a chat message. Especially good when the sub-agent might need to look
at adjacent files (sibling configs, related source) to answer well.`;

const cli = cac("tacit-skill");

cli.command("", "show core principles and applicability").action(() => {
  console.log(PRINCIPLES);
});

cli.command("taste", "show the 6 rules for writing good tacit scripts").action(
  () => {
    console.log(TASTE);
  },
);

cli.command("examples", "show 3 canonical tacit-script patterns").action(() => {
  console.log(EXAMPLES);
});

cli.help(() => [{ body: PRINCIPLES }]);

try {
  cli.parse();
} catch (e) {
  console.error((e as Error).message);
  console.error("run with --help to see usage.");
  process.exit(1);
}
