# Autonomous Crypto Agent — Phase 1

A small, testnet-first wallet agent scaffold. This version connects to Ethereum Sepolia, reads a wallet balance, and previews a transfer. It **does not sign or broadcast transactions** and does not connect to Tor yet.

## Why this starts in test mode
The project will first prove that wallet lookup, fee estimation, and transaction previews work without risking real funds. Transaction signing and Tor connectivity are separate later phases.

## Requirements
- Node.js 20+
- A Sepolia RPC URL from a provider
- A public wallet address for read-only balance checks

## Run
1. Copy .env.example to .env.
2. Set SEPOLIA_RPC_URL and optionally AGENT_WALLET_ADDRESS.
3. Run npm install
4. Run npm start
5. Open http://localhost:3000

## API
- GET /api/health — service status and configured network
- GET /api/wallet — wallet address and Sepolia balance (read-only)
- POST /api/transactions/preview — validate and preview a Sepolia transfer; does not sign or send

## Security
- Never commit .env, private keys, seed phrases, or API credentials.
- Do not use a personal wallet for an autonomous agent.
- Do not put real funds into this prototype.
- All transfer previews are limited to Sepolia testnet.
