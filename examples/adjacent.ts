#!/usr/bin/env tacit
import { ai } from "tacit";

// Three consecutive ai() calls with the SAME input but different
// types/variable names. If line-number resolution works correctly, each
// call should be answered independently based on its own line.

const sentence = "The quick brown fox jumps over the lazy dog.";

const wordCount: number = await ai({ input: sentence });
const verbs: string[] = await ai({ input: sentence });
const isPangram: boolean = await ai({ input: sentence });

console.log({ wordCount, verbs, isPangram });
