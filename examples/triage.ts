#!/usr/bin/env tacit
import { agent } from "tacit";

// More elaborate test: nested types, multiple fields, free-form text.
// Still no prompt — verb + type + variable name carry all the intent.

const email = "PRODUCTION DOWN! Our checkout integration is throwing 500s, customers can't pay!";

const triage: {
  category: "billing" | "technical" | "account" | "other";
  urgency: 1 | 2 | 3 | 4 | 5;
  reason: string;
} = await agent.triage({ input: email });

console.log(JSON.stringify(triage, null, 2));
