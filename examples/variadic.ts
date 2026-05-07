#!/usr/bin/env tacit
import { agent } from "tacit";

// Show that any agent.<verb>() accepts any number of positional args.
// Library reads the source line — knows what each arg is from the code.

// Form 1: no args, pure code-driven
const greeting: string = await agent.greet();

// Form 2: single positional arg
const sentiment: "positive" | "negative" | "neutral" = await agent.classify(
  "I absolutely love this product, it changed my life!",
);

// Form 3: multiple positional args
const fullName: string = await agent.combine("Lamarck", "Claude");

// Form 4: explicit object form
const wordCount: number = await agent.count({ input: "The quick brown fox jumps." });

console.log({ greeting, sentiment, fullName, wordCount });
