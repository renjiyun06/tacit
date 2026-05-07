#!/usr/bin/env tacit
import { agent } from "tacit";

// Progressive disclosure: instead of reading the file ourselves and
// stuffing the contents into the prompt, we just hand the path to
// the sub-agent and let it Read what it needs.
//
// The sub-agent has full tool access (Read / Grep / Glob / Bash).
// The verb + comment below tell it what we want; no special prompt needed.

// Use the Read tool to load the README at the path below, then return a
// structured summary. Read only the first ~150 lines if it's large.

const summary: {
  one_line_pitch: string;
  primary_use_cases: string[];
  hard_constraints: string[];
  install_command: string;
} = await agent.summarize("/home/lamarck/aion/tacit/README.md");

console.log(JSON.stringify(summary, null, 2));
