require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const { assessRisk, calculatePositionNotional } = require("./risk-engine");

const app = express();
app.use(express.json({ limit: "16kb" }));

const PORT = Number(process.env.PORT || 3000);
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const configuredAddress = process.env.AGENT_WALLET_ADDRESS || "";

function providerOrThrow() {
  if (!RPC_URL) throw new Error("SEPOLIA_RPC_URL is not configured");
  return new ethers.JsonRpcProvider(RPC_URL, 11155111);
}

function validAddress(address) {
  return typeof address === "string" && ethers.isAddress(address);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "autonomous-crypto-agent",
    phase: "testnet-read-only",
    network: "Ethereum Sepolia",
    chainId: 11155111,
    signingEnabled: false,
    transactionBroadcastEnabled: false,
    torEnabled: false
  });
});

app.get("/api/wallet", async (_req, res) => {
  try {
    if (!validAddress(configuredAddress)) {
      return res.status(400).json({
        ok: false,
        error: "Set AGENT_WALLET_ADDRESS to a valid public wallet address."
      });
    }
    const provider = providerOrThrow();
    const [balance, network] = await Promise.all([
      provider.getBalance(configuredAddress),
      provider.getNetwork()
    ]);
    if (Number(network.chainId) !== 11155111) {
      return res.status(502).json({ ok: false, error: "RPC endpoint is not Sepolia." });
    }
    res.json({
      ok: true,
      network: "Ethereum Sepolia",
      address: configuredAddress,
      balanceWei: balance.toString(),
      balanceEth: ethers.formatEther(balance),
      readOnly: true
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message || "Wallet lookup failed." });
  }
});

app.post("/api/transactions/preview", async (req, res) => {
  try {
    const { to, amountEth } = req.body || {};
    if (!validAddress(to)) {
      return res.status(400).json({ ok: false, error: "Recipient must be a valid Ethereum address." });
    }
    if (typeof amountEth !== "string" || !/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(amountEth)) {
      return res.status(400).json({ ok: false, error: "amountEth must be a decimal string with up to 18 decimal places." });
    }
    const value = ethers.parseEther(amountEth);
    if (value <= 0n) {
      return res.status(400).json({ ok: false, error: "Amount must be greater than zero." });
    }
    const provider = providerOrThrow();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 11155111) {
      return res.status(502).json({ ok: false, error: "Refusing to preview against a non-Sepolia network." });
    }
    const feeData = await provider.getFeeData();
    res.json({
      ok: true,
      network: "Ethereum Sepolia",
      chainId: 11155111,
      from: validAddress(configuredAddress) ? configuredAddress : null,
      to: ethers.getAddress(to),
      amountEth,
      amountWei: value.toString(),
      maxFeePerGasWei: feeData.maxFeePerGas?.toString() || null,
      maxPriorityFeePerGasWei: feeData.maxPriorityFeePerGas?.toString() || null,
      status: "preview_only",
      signed: false,
      broadcast: false,
      message: "No funds moved. This endpoint only creates a transaction preview."
    });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message || "Transaction preview failed." });
  }
});


app.post("/api/paper/risk-check", (req, res) => {
  try {
    const { equity, peakEquity, dayStartEquity, proposedNotional, riskFraction, stopDistanceFraction } = req.body || {};
    const result = assessRisk({ equity, peakEquity, dayStartEquity, proposedNotional });
    const suggestedNotional =
      Number.isFinite(riskFraction) && Number.isFinite(stopDistanceFraction)
        ? calculatePositionNotional({ equity, riskFraction, stopDistanceFraction })
        : null;
    res.json({
      ok: true,
      ...result,
      suggestedNotional,
      message: "Simulation risk check only. No exchange order is created, signed, or broadcast."
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Risk check failed." });
  }
});

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

app.listen(PORT, () => {
  console.log("Autonomous Crypto Agent listening on port " + PORT);
});
