#!/usr/bin/env tacit
import { agent } from "tacit";

// A tiny imperative language: numbers, variables, binops, let/assign,
// if/else, while, return. The whole AST is encoded as discriminated
// unions — that's the only spec the agent gets.

type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | {
      kind: "binop";
      op: "+" | "-" | "*" | "/" | "<" | ">" | "<=" | ">=" | "==";
      left: Expr;
      right: Expr;
    };

type Stmt =
  | { kind: "let"; name: string; value: Expr }
  | { kind: "assign"; name: string; value: Expr }
  | { kind: "while"; cond: Expr; body: Stmt[] }
  | { kind: "if"; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { kind: "return"; value: Expr };

type Program = Stmt[];

// ── Pure TS interpreter for the AST above ────────────────────────────

function evalExpr(e: Expr, env: Map<string, number>): number {
  switch (e.kind) {
    case "num": return e.value;
    case "var": {
      const v = env.get(e.name);
      if (v === undefined) throw new Error(`undefined variable: ${e.name}`);
      return v;
    }
    case "binop": {
      const l = evalExpr(e.left, env);
      const r = evalExpr(e.right, env);
      switch (e.op) {
        case "+":  return l + r;
        case "-":  return l - r;
        case "*":  return l * r;
        case "/":  return l / r;
        case "<":  return l <  r ? 1 : 0;
        case ">":  return l >  r ? 1 : 0;
        case "<=": return l <= r ? 1 : 0;
        case ">=": return l >= r ? 1 : 0;
        case "==": return l === r ? 1 : 0;
      }
    }
  }
}

type ReturnSignal = { kind: "return"; value: number };

function evalStmts(stmts: Stmt[], env: Map<string, number>): ReturnSignal | null {
  for (const s of stmts) {
    const r = evalStmt(s, env);
    if (r !== null) return r;
  }
  return null;
}

function evalStmt(s: Stmt, env: Map<string, number>): ReturnSignal | null {
  switch (s.kind) {
    case "let":
    case "assign":
      env.set(s.name, evalExpr(s.value, env));
      return null;
    case "while":
      while (evalExpr(s.cond, env) !== 0) {
        const r = evalStmts(s.body, env);
        if (r !== null) return r;
      }
      return null;
    case "if": {
      const branch = evalExpr(s.cond, env) !== 0 ? s.then : s.else ?? [];
      return evalStmts(branch, env);
    }
    case "return":
      return { kind: "return", value: evalExpr(s.value, env) };
  }
}

function run(program: Program): number {
  const env = new Map<string, number>();
  const r = evalStmts(program, env);
  if (r === null) throw new Error("program reached end without `return`");
  return r.value;
}

// ── The actual test ───────────────────────────────────────────────────

const code = `
  let n = 5
  let result = 1
  while (n > 0) {
    if (n > 1) {
      result = result * n
    }
    n = n - 1
  }
  return result
`;

// Parse the source above into a Program AST. The verb (`parse`) plus
// the discriminated-union types are the spec.
const program: Program = await agent.parse(code);

const computed = run(program);
const expected = 120;   // 5! = 5 * 4 * 3 * 2

console.log("Source code:");
console.log(code);
console.log("AST:", JSON.stringify(program, null, 2));
console.log("Computed: ", computed);
console.log("Expected: ", expected);
console.log("Match?    ", computed === expected ? "✓" : "✗");
