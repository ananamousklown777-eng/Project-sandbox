"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

test("HTTP risk-check endpoint validates requests and returns simulation-only results", async (t) => {
  const port = 31000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });
  t.after(() => child.kill("SIGTERM"));

  const base = "http://127.0.0.1:" + port;
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error("server exited before listening");
    try {
      const response = await fetch(base + "/api/health");
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "server should start within five seconds");

  const allowed = await fetch(base + "/api/paper/risk-check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      equity: 10000, peakEquity: 10000, dayStartEquity: 10000,
      proposedNotional: 150, riskFraction: 0.01, stopDistanceFraction: 0.02
    })
  });
  assert.equal(allowed.status, 200);
  const result = await allowed.json();
  assert.equal(result.ok, true);
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "simulation_only");
  assert.equal(result.suggestedNotional, 200);
  assert.match(result.message, /No exchange order is created/);

  const blocked = await fetch(base + "/api/paper/risk-check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      equity: 10000, peakEquity: 10000, dayStartEquity: 10000,
      proposedNotional: 250
    })
  });
  assert.equal(blocked.status, 200);
  const blockedResult = await blocked.json();
  assert.equal(blockedResult.allowed, false);
  assert.ok(blockedResult.reasons.includes("position_limit_exceeded"));

  const invalid = await fetch(base + "/api/paper/risk-check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ equity: -1, peakEquity: 10000, dayStartEquity: 10000, proposedNotional: 100 })
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).ok, false);
});
