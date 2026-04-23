#!/usr/bin/env tacit
import { ai } from "tacit";

// A minimal agent: classify a customer email into one of three categories.
// Notice there is NO prompt — the type annotation IS the spec.

const email = "Hi, I was charged twice for last month's subscription. Please refund.";

const category: "billing" | "technical" | "account" = await ai(email);

console.log(`category: ${category}`);
