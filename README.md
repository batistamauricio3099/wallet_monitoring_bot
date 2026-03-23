# Wallet Monitor

Ethereum wallet monitoring app. Track addresses, view balances and transactions, and get Discord alerts for new activity.

## Features

- **Ethereum only** — Monitor one Ethereum address per bot (native ETH + token transfers).
- **Bots** — Create multiple bots; each has a name, one wallet address, and an optional Discord webhook.
- **Run / Stop** — When a bot is running, the server polls Etherscan and stores new transactions.
- **Discord alerts** — New transactions can be sent to a Discord channel via webhook (optional).
- **Dashboard** — View balance, USD value, and transaction history with date filters and Etherscan links.

## Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or remote)
- (Optional) Discord webhook URL for alerts

## Setup

1. **Install all dependencies** (run once in the project root):

   ```bash
   npm install
   ```
   This installs root, backend, and frontend dependencies (postinstall runs `npm install` in `backend` and `frontend`).

2. **Configure environment**

   Copy the backend example env and set your values:

   ```bash
   cp backend/.env.example backend/.env
   ```
   On Windows (PowerShell): `copy backend\.env.example backend\.env`

   Edit `backend/.env` and set at least:

   - `MONGODB_URI` — Your MongoDB connection string
   - `ADMIN_PASSWORD` — A strong password for the admin lock screen (never commit real values)

## Running

You can run backend and frontend **together** (one command) or **separately** (two terminals). No build is required for development.

### Both together (no build)

From the project root:

```bash
npm run dev
```

This starts the backend (port **8001**) and frontend (port **3000**). Open **http://localhost:8001** — the backend proxies the UI from Vite.

### Backend only

```bash
npm run dev:backend
```

Open **http://localhost:8001**. You get the API and a short info page with instructions: run `npm run dev:frontend` and open **http://localhost:3000** for the UI.

### Frontend only

```bash
npm run dev:frontend
```

Open **http://localhost:3000** for the UI. The frontend proxies `/api` to **http://localhost:8001**, so start the backend in another terminal for the app to work.

### Production (with build)

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Start the backend (it will serve the built frontend):

   ```bash
   npm start --prefix backend
   ```

   Or from the `backend` folder: `npm start`.

   App is at **http://localhost:8001** (or your `PORT`).

### Scripts summary

| Command | Description |
|--------|-------------|
| `npm run dev` | Run backend + frontend; open http://localhost:8001 |
| `npm run dev:backend` | Backend only; open http://localhost:8001 |
| `npm run dev:frontend` | Frontend only; open http://localhost:3000 (needs backend on 8001) |
| `npm run build` | Build frontend into `frontend/dist` |
| `npm start --prefix backend` | Start backend (use after build) |

## Environment variables (backend)

Create `backend/.env` from `backend/.env.example`. Keep all values private.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8001` |
| `MONGODB_URI` | MongoDB connection string | — |
| `ADMIN_PASSWORD` | Admin login password | — |
| `ETH_REFRESH_INTERVAL_MS` | Polling interval for Ethereum (ms) | `6000` |
| `CHAIN_DELAY_MS` | Delay between wallets per poll (ms) | `400` |
| `FETCH_INTERVAL_MINUTES` | Cron interval to refresh all wallets | `30` |
| `ETHERSCAN_BASE` | Etherscan base URL | `https://etherscan.io` |
| `VITE_DEV_URL` | Vite dev server URL (when using proxy) | `http://localhost:3000` |
| `PROXY_TO_VITE` | Set to `1` when running `npm run dev` so backend proxies UI | — |

## Project structure

```
Wallet-monitoring-bot/
├── backend/              # Express API + monitoring
│   ├── config/           # DB connection
│   ├── models/           # Bot, Wallet, Transaction (Mongoose)
│   ├── routes/           # /api/bots, /api/wallets, /api/auth
│   ├── services/         # Etherscan, wallet logic, Discord
│   ├── server.js
│   └── .env.example
├── frontend/             # React + Vite
│   ├── public/icons/     # eth.svg (Ethereum only)
│   ├── src/
│   │   ├── components/   # Admin, Dashboard, LockScreen
│   │   └── App.jsx
│   └── vite.config.js
├── package.json          # Root scripts (dev, build)
├── .gitignore
└── README.md             # This file
```

## Usage

1. **Login** — Open the app and enter your admin password.
2. **Create a bot** — Click “Add bot”, set name, optional Discord webhook, and one Ethereum address (0x…).
3. **Run** — Click “Run” on a bot to start monitoring.
4. **Alerts** — If a Discord webhook is set, new transactions are posted to that channel.
5. **Dashboard** — Click a bot to see balance, USD value, and transaction list with date filters and Etherscan links.

## API overview

- `POST /api/auth/login` — Body: `{ "password": "<your-admin-password>" }`
- `GET /api/bots` — List bots
- `POST /api/bots` — Create bot (`name`, `walletEthereum`, `discordWebhookUrl`)
- `PATCH /api/bots/:id` — Update bot
- `DELETE /api/bots/:id` — Delete bot
- `POST /api/bots/:id/run` — Start monitoring
- `POST /api/bots/:id/stop` — Stop monitoring
- `GET /api/wallets/:address` — Get wallet + transactions
- `POST /api/wallets/:address/refresh` — Manually refresh wallet
- `GET /health` — Health check

## Security

- **Never commit** `backend/.env` or any file with real passwords, MongoDB URIs, or Discord webhook URLs.
- Use `backend/.env.example` only as a template; set your own values and keep them secret.
- Do not paste or log credentials in issues, docs, or code.

## License

Private / unlicensed unless stated otherwise.
