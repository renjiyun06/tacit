#!/usr/bin/env tacit
import { agent } from "tacit";

// A minimal agent: classify a customer email into one of three categories.
// Notice there is NO prompt — the verb (`classify`), the type annotation,
// and the variable name together carry all the intent.

const email = "Hi, I was charged twice for last month's subscription. Please refund.";

const category: "billing" | "technical" | "account" = await agent.classify(email);

console.log(`category: ${category}`);
