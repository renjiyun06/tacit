#!/usr/bin/env tacit
import { agent } from "tacit";

// Three consecutive calls with the SAME input but different verbs,
// types, and variable names. Each verb (count / extract / check) gives
// the agent a different lens on the same sentence. Line-number resolution
// keeps each call independent.

const sentence = "The quick brown fox jumps over the lazy dog.";

const wordCount: number = await agent.count({ input: sentence });
const verbs: string[] = await agent.extract({ input: sentence });
const isPangram: boolean = await agent.check({ input: sentence });

console.log({ wordCount, verbs, isPangram });
