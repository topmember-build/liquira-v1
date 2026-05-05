#!/usr/bin/env node
/**
 * Lightweight UI regression check (no test runner required).
 * Verifies that:
 *  1. SMOKE_TEST_ONLY is fully removed from source.
 *  2. The Arc on-chain phase panel renders whenever wallet is connected to
 *     Arc Testnet (no smoke-test gate, no hidden flag).
 *  3. Wallet connection is not blocked by treasury / smoke-test pre-checks.
 *  4. No em dashes remain in user-facing source files.
 *
 * Run: node scripts/regression-check.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const fail = [];
const ok = (msg) => console.log("  ok  " + msg);
const bad = (msg) => { fail.push(msg); console.log("  FAIL " + msg); };

function grep(pattern, opts = "") {
  try {
    return execSync(`rg ${opts} -n ${JSON.stringify(pattern)} src/`, { encoding: "utf8" });
  } catch { return ""; }
}

// 1. No smoke test references
const smoke = grep("smoke[ _-]?test|SMOKE_TEST_ONLY", "-i");
if (smoke.trim()) bad("smoke-test references still present:\n" + smoke);
else ok("no smoke-test references in src/");

// 2. Phase panel renders whenever connected to Arc Testnet
const router = readFileSync("src/components/site/Router.tsx", "utf8");
if (/isArcTestnet && wallet\.connected && \(/.test(router))
  ok("on-chain phase panel gated only by isArcTestnet + wallet.connected");
else bad("phase panel gate not simplified to isArcTestnet + wallet.connected");

// 3. Wallet connection not blocked by treasury risk
if (!/id:\s*"treasury",\s*level:\s*"block"/.test(router))
  ok("treasury check is not a blocking risk");
else bad("treasury still produces a blocking risk");

if (!/Destination treasury address is invalid/.test(router))
  ok("removed 'Destination treasury address is invalid' message");
else bad("'Destination treasury address is invalid' still present");

// 4. No em dashes anywhere in src/
const dashes = grep("—");
if (!dashes.trim()) ok("no em dashes in src/");
else bad("em dashes remain:\n" + dashes);

// 5. Hook resolves wallet client lazily so executes don't fail with "connect wallet"
const hook = readFileSync("src/hooks/use-onchain-swap.ts", "utf8");
if (/getWalletClient\(wagmiConfigRef/.test(hook))
  ok("execute() lazily resolves wallet client to avoid stale 'connect wallet' errors");
else bad("execute() does not lazily resolve wallet client");

console.log(fail.length ? `\n${fail.length} check(s) failed.` : "\nAll regression checks passed.");
process.exit(fail.length ? 1 : 0);
