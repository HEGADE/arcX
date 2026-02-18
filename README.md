# Karnot — Grid Trading Bot for Hyperliquid

A full-stack application to configure and run a grid trading bot on Hyperliquid testnet. The bot places a ladder of buy and sell limit orders at fixed price intervals around the current market price and maintains the grid by replenishing filled or cancelled orders.

## Architecture

```
┌─────────────────┐     REST      ┌─────────────────┐     Hyperliquid     ┌──────────────────────┐
│  React + Vite   │ ◄──────────► │  Express API    │ ◄─────────────────► │ api.hyperliquid-testnet.xyz │
│  Frontend       │               │  + Grid Engine  │                     │       (testnet)       │
└─────────────────┘               └─────────────────┘                     └──────────────────────┘
```

- **Frontend**: React + Vite, dark trading UI. Config form, start/stop controls, live status dashboard.
- **Backend**: Node.js + Express. REST API for bot control. Grid strategy engine using `@nktkas/hyperliquid`.
- **API Wallet**: Bot uses an API wallet (agent wallet) for signing—trade-only, no withdraw. Queries use the main account address.

## Strategy Logic

1. **Grid levels**: Given mid price, grid size, and spacing %, compute buy levels below mid and sell levels above mid:
   - Buy: `mid × (1 / (1 + spacing/100))^i` for i = 1..gridSize
   - Sell: `mid × (1 + spacing/100)^i` for i = 1..gridSize

2. **Reconciliation**: On start and every ~6 seconds, compare expected grid with open orders. Place orders only for missing levels (avoids duplicates after restart).

3. **Replenishment**: When orders are filled or externally cancelled, the next maintenance cycle places replacement orders.

4. **Clean stop**: On stop, cancel all open grid orders for the symbol.

5. **Risk guardrails (optional)**: If configured, the bot auto-stops and cancels managed orders when either:
   - absolute position size exceeds `maxPositionAbs`
   - account drawdown from start exceeds `maxDrawdownUsd`

## API Wallet Setup

Before using the bot:

1. Go to [app.hyperliquid-testnet.xyz/API](https://app.hyperliquid-testnet.xyz/API)
2. Connect your main wallet and click **Generate** to create an API wallet
3. Save the API wallet private key
4. Approve the API wallet (one-time; main wallet signs)

Then provide the bot with:
- **API wallet private key** — used for signing orders (cannot withdraw)
- **Main account address** — used for querying orders, positions, PnL

## How to Run

### With Docker (recommended)

```bash
docker-compose up
```

- Frontend: http://localhost
- Backend: http://localhost:3001

### Local development

**Backend:**
```bash
cd backend && npm install && npm run dev
```

**Frontend:**
```bash
cd frontend && npm install && npm run dev
```

Frontend dev server proxies `/api` to the backend. Open http://localhost:5173.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: 3001) |
| `NODE_ENV` | `development` or `production` |
| `VITE_API_URL` | Backend URL for frontend (optional; use proxy in dev) |

## Project Structure

```
karnot/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/          # React + Vite
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
└── backend/           # Node.js + Express
    ├── Dockerfile
    └── src/
        ├── index.ts
        ├── routes.ts
        ├── gridEngine.ts
        └── hyperliquid.ts
```

## Key Decisions

- **@nktkas/hyperliquid**: Community TypeScript SDK.
- **API Wallet**: Trade-only auth; main wallet private key never used by the bot.
- **Reconciliation**: Compare expected grid vs open orders before placing; use hex `cloid` for idempotency.
- **Risk controls**: Optional max position and max drawdown limits trigger automatic shutdown.
- **Testnet only**: Fixed to Hyperliquid testnet per assignment requirement.

## Security Considerations

- **API wallet usage only**: The bot uses Hyperliquid API wallets (agent wallets), not main wallet private keys.
- **No key persistence by default**: Credentials are submitted from UI to backend at start time and kept in process memory only while bot runs.
- **No withdrawal path**: Strategy uses order/cancel operations only.
- **Input validation**: Backend validates key/address format and strategy bounds before starting.
- **Blast radius controls in current scope**: Bot is single-symbol and supports clean stop (cancels managed grid orders for that symbol).

## Deployment Assumptions and Risks

- **Secrets handling (production)**: API keys should be provided via a secure secret manager/KMS and never hardcoded.
- **Transport security**: In production, frontend/backend and any control plane traffic should be behind TLS and authenticated access.
- **Logging policy**: Avoid logging raw private keys/secrets; use redaction and structured logs.
- **State durability**: Current implementation is in-memory. A production setup should persist bot config/state and maintain audit trails.
- **Risk controls not yet implemented**: Add max position size, max drawdown, and emergency kill-switch before real-money deployment.

## Future Improvements

- WebSocket for real-time order/position updates instead of polling
- Persistent config (e.g. Redis) across restarts
- Multi-symbol support
- Order history and PnL charts
