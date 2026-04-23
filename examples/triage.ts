#!/usr/bin/env tacit
import { ai } from "tacit";

// More elaborate test: nested types, multiple fields, free-form text.
// Still no prompt — type + variable name carry all the intent.

const email = "PRODUCTION DOWN! Our checkout integration is throwing 500s, customers can't pay!";

const triage: {
  category: "billing" | "technical" | "account" | "other";
  urgency: 1 | 2 | 3 | 4 | 5;
  reason: string;
} = await ai({ input: email });

console.log(JSON.stringify(triage, null, 2));
