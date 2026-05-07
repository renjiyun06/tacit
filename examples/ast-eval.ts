#!/usr/bin/env tacit
import { agent } from "tacit";

// AST node types for simple arithmetic expressions.
// Discriminated union — `kind` is the tag.
type Expr =
  | { kind: "num"; value: number }
  | { kind: "add"; left: Expr; right: Expr }
  | { kind: "sub"; left: Expr; right: Expr }
  | { kind: "mul"; left: Expr; right: Expr }
  | { kind: "div"; left: Expr; right: Expr };

// Pure interpreter that walks the AST. No agent here — we verify the
// AST is well-formed and computable.
function evaluate(expr: Expr): number {
  switch (expr.kind) {
    case "num": return expr.value;
    case "add": return evaluate(expr.left) + evaluate(expr.right);
    case "sub": return evaluate(expr.left) - evaluate(expr.right);
    case "mul": return evaluate(expr.left) * evaluate(expr.right);
    case "div": return evaluate(expr.left) / evaluate(expr.right);
  }
}

const code = "(3 + 4) * 5 - 6 / 2";

// Ask the agent to parse the expression into an AST. The verb (`parse`)
// plus the discriminated-union type are the entire spec — no prompt,
// no schema.
const ast: Expr = await agent.parse(code);

const computed = evaluate(ast);
const expected = (3 + 4) * 5 - 6 / 2;

console.log("Expression:", code);
console.log("AST:", JSON.stringify(ast, null, 2));
console.log("Computed: ", computed);
console.log("Expected: ", expected);
console.log("Match?    ", computed === expected ? "✓" : "✗");
