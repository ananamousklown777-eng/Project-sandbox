"use strict";

// Deterministic risk checks for simulation only.
// This module never connects to an exchange, signs transactions, or sends orders.

const DEFAULT_LIMITS = Object.freeze({
  maxPositionPct: 0.02,
  maxDailyLossPct: 0.05,
  maxDrawdownPct: 0.15
});

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(name + " must be a finite number greater than zero");
  }
  return value;
}

function assessRisk({ equity, peakEquity, dayStartEquity, proposedNotional, limits = {} }) {
  finitePositive(equity, "equity");
  finitePositive(peakEquity, "peakEquity");
  finitePositive(dayStartEquity, "dayStartEquity");
  if (!Number.isFinite(proposedNotional) || proposedNotional < 0) {
    throw new TypeError("proposedNotional must be a finite number greater than or equal to zero");
  }

  const rules = { ...DEFAULT_LIMITS, ...limits };
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    if (!Number.isFinite(rules[key]) || rules[key] <= 0 || rules[key] > 1) {
      throw new TypeError(key + " must be greater than zero and at most one");
    }
  }

  const positionPct = proposedNotional / equity;
  const dailyLossPct = Math.max(0, (dayStartEquity - equity) / dayStartEquity);
  const drawdownPct = Math.max(0, (peakEquity - equity) / peakEquity);
  const reasons = [];

  if (positionPct > rules.maxPositionPct) reasons.push("position_limit_exceeded");
  if (dailyLossPct >= rules.maxDailyLossPct) reasons.push("daily_loss_limit_reached");
  if (drawdownPct >= rules.maxDrawdownPct) reasons.push("max_drawdown_reached");

  return Object.freeze({
    allowed: reasons.length === 0,
    mode: "simulation_only",
    positionPct,
    dailyLossPct,
    drawdownPct,
    limits: rules,
    reasons
  });
}

function calculatePositionNotional({ equity, riskFraction = 0.01, stopDistanceFraction }) {
  finitePositive(equity, "equity");
  finitePositive(riskFraction, "riskFraction");
  finitePositive(stopDistanceFraction, "stopDistanceFraction");
  if (riskFraction > 1 || stopDistanceFraction > 1) {
    throw new TypeError("riskFraction and stopDistanceFraction must be at most one");
  }

  // Dollar risk = equity * riskFraction; notional = dollar risk / stop distance.
  // Cap notional at the default 2% position ceiling from the example spec.
  const riskBasedNotional = (equity * riskFraction) / stopDistanceFraction;
  return Math.min(riskBasedNotional, equity * DEFAULT_LIMITS.maxPositionPct);
}

module.exports = { DEFAULT_LIMITS, assessRisk, calculatePositionNotional };
