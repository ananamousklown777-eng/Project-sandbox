"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assessRisk, calculatePositionNotional } = require("../risk-engine");

test("allows a proposal inside all risk limits", () => {
  const result = assessRisk({
    equity: 10000,
    peakEquity: 10000,
    dayStartEquity: 10000,
    proposedNotional: 150
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.reasons, []);
});

test("blocks position size above two percent", () => {
  const result = assessRisk({
    equity: 10000,
    peakEquity: 10000,
    dayStartEquity: 10000,
    proposedNotional: 201
  });
  assert.equal(result.allowed, false);
  assert.ok(result.reasons.includes("position_limit_exceeded"));
});

test("halts at daily loss limit", () => {
  const result = assessRisk({
    equity: 9500,
    peakEquity: 10000,
    dayStartEquity: 10000,
    proposedNotional: 100
  });
  assert.ok(result.reasons.includes("daily_loss_limit_reached"));
});

test("halts at max drawdown", () => {
  const result = assessRisk({
    equity: 8400,
    peakEquity: 10000,
    dayStartEquity: 10000,
    proposedNotional: 100
  });
  assert.ok(result.reasons.includes("max_drawdown_reached"));
});

test("position sizing never exceeds the two percent cap", () => {
  assert.equal(
    calculatePositionNotional({ equity: 10000, riskFraction: 0.01, stopDistanceFraction: 0.01 }),
    200
  );
});
