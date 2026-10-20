# Autonomous Crypto Agent — Phase 1

A small, testnet-first wallet agent scaffold. This version connects to Ethereum Sepolia, reads a wallet balance, previews a transfer, and provides deterministic risk checks for simulation. It **does not sign or broadcast transactions** and does not connect to Tor or cryptocurrency exchanges.

## Why this starts in test mode

The project first proves wallet lookup, fee estimation, transaction previews, and risk controls without risking real funds. Strategy research, historical backtesting, and paper-trading persistence are later phases. Passing unit tests is not evidence of profitability.

## Requirements

- Node.js 20+
- A Sepolia RPC URL from a provider
- An optional public wallet address for read-only balance checks

## Run

1. Copy `.env.example` to `.env`.
2. Set `SEPOLIA_RPC_URL` and optionally `AGENT_WALLET_ADDRESS`.
3. Run `npm install`.
4. Run `npm test`.
5. Run `npm start`.

Never share or commit private keys, seed phrases, or API credentials. The current project does not need a private key.

## API

- `GET /api/health` — service status and configured network
- `GET /api/wallet` — public wallet address and Sepolia balance (read-only)
- `POST /api/transactions/preview` — validate and preview a Sepolia transfer; does not sign or send
- `POST /api/paper/risk-check` — evaluate a proposed simulated position against risk limits; does not create an order

### Risk-check example

Send JSON to `/api/paper/risk-check`:

```json
{
  "equity": 10000,
  "peakEquity": 10000,
  "dayStartEquity": 10000,
  "proposedNotional": 150,
  "riskFraction": 0.01,
  "stopDistanceFraction": 0.02
}
```

The defaults are a maximum position notional of 2% of equity, a daily loss stop at 5%, and a drawdown stop at 15%. These are illustrative guardrails, not a guarantee against losses. The endpoint only checks inputs and returns a suggested notional; it does not execute trades.

## Automated tests

GitHub Actions runs `npm test` on pushes to `main` and pull requests targeting `main`.

## Security

- Never commit `.env`, private keys, seed phrases, or API credentials.
- Do not use a personal wallet for an autonomous agent.
- Do not put real funds into this prototype.
- Transfer previews are restricted to Sepolia testnet.
- No exchange execution, signing, or transaction broadcasting is implemented.
