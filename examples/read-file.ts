#!/usr/bin/env tacit
import { ai } from "tacit";

// Progressive disclosure: instead of reading the file ourselves and
// stuffing the contents into the prompt, we just hand the path to
// the sub-agent and let it Read what it needs.
//
// The sub-Claude has full tool access (Read / Grep / Glob / Bash).
// The comment below tells it what we want; no special prompt needed.

// Use the Read tool to load the README at the path below, then return a
// structured summary. Read only the first ~150 lines if it's large.

const summary: {
  one_line_pitch: string;
  primary_use_cases: string[];
  hard_constraints: string[];
  install_command: string;
} = await ai("/home/lamarck/forge-ai/tacit/README.md");

console.log(JSON.stringify(summary, null, 2));
