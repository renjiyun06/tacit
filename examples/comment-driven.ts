#!/usr/bin/env tacit
import { agent } from "tacit";

// Same numeric union that previously confused the agent (1-5 scale,
// no semantic direction). This time we just write a comment to
// clarify — the agent sees the full source so the comment IS context.

const email = "PRODUCTION DOWN! Checkout integration throwing 500s!";

// urgency scale: 5 = production outage / critical, 1 = trivial cosmetic
const urgency: 1 | 2 | 3 | 4 | 5 = await agent.score(email);

console.log({ urgency });
