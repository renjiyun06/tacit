#!/usr/bin/env tacit
import { ai } from "tacit";

// Show that ai() accepts any number of positional args.
// Library reads the source line — knows what each arg is from the code.

// Form 1: no args, pure code-driven
const greeting: string = await ai();

// Form 2: single positional arg
const sentiment: "positive" | "negative" | "neutral" = await ai(
  "I absolutely love this product, it changed my life!",
);

// Form 3: multiple positional args
const fullName: string = await ai("Lamarck", "Claude");

// Form 4: explicit object form (still works, backward compat)
const wordCount: number = await ai({ input: "The quick brown fox jumps." });

console.log({ greeting, sentiment, fullName, wordCount });
