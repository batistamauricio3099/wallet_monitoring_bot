import './file-global.js';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cron from 'node-cron';
import { connectDB } from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import walletRoutes from './routes/walletRoutes.js';
import authRoutes from './routes/authRoutes.js';
import botRoutes from './routes/botRoutes.js';
import logger from './utils/logger.js';
import { refreshAllWallets, refreshWallet } from './services/walletService.js';
import { getRunningConfigs } from './services/runningBotsStore.js';
import Transaction from './models/Transaction.js';

await connectDB();

// Ensure (transactionHash, walletAddress, token) is the only unique index so "no token" and "has token" are different
const ensureTransactionIndex = async () => {
  const coll = Transaction.collection;
  const indexes = await coll.indexes();
  for (const idx of indexes) {
    if (idx.unique && idx.key && !idx.key.token) {
      const keys = Object.keys(idx.key || {}).sort().join(',');
      if (keys === 'transactionHash,walletAddress') {
        try {
          await coll.dropIndex(idx.name);
          console.log('Dropped legacy 2-field unique index:', idx.name);
        } catch (e) {
          if (e.code !== 27 && e.codeName !== 'IndexNotFound') console.warn('Index drop:', e.message);
        }
      }
    }
  }
  await Transaction.syncIndexes();
};
ensureTransactionIndex().catch((e) => console.warn('ensureTransactionIndex:', e.message));

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger.logRequest);

app.use('/api/wallets', walletRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

// Serve built frontend, or (when PROXY_TO_VITE) proxy to Vite, or show "run frontend" page
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const viteDevUrl = process.env.VITE_DEV_URL || 'http://localhost:3000';
const proxyToVite = /^(1|true|yes)$/i.test(process.env.PROXY_TO_VITE || '');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else if (proxyToVite) {
  app.use(
    createProxyMiddleware({
      target: viteDevUrl,
      changeOrigin: true,
      ws: true,
      pathFilter: (pathname) => !pathname.startsWith('/api') && pathname !== '/health',
    })
  );
  console.log(`No frontend build; proxying to Vite at ${viteDevUrl}`);
} else {
  const backendPort = process.env.PORT || 8001;
  app.get('/', (_, res) => {
    res.type('html').send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Wallet Monitor – API</title></head><body>
  <h1>Wallet Monitor – API</h1>
  <p>Backend is running. API: <a href="/api/bots">/api/bots</a>, <a href="/health">/health</a></p>
  <p><strong>To use the UI (no build):</strong> run <code>npm run dev:frontend</code> from the project root, then open <a href="${viteDevUrl}">${viteDevUrl}</a></p>
  <p><strong>Or</strong> build and serve from here: <code>npm run build</code> then restart the backend and open <a href="http://localhost:${backendPort}">http://localhost:${backendPort}</a></p>
</body></html>`);
  });
  app.get('*', (req, res, next) => {
    if (req.path === '/' || req.path === '') return next();
    res.status(404).type('html').send(`<p>Not found. <a href="/">Back to API info</a></p>`);
  });
  console.log(`No frontend build. Run frontend: npm run dev:frontend → ${viteDevUrl}`);
}

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Ethereum refresh interval (ms)
const ETH_REFRESH_INTERVAL_MS = parseInt(process.env.ETH_REFRESH_INTERVAL_MS, 10) || 6_000;
const CHAIN_DELAY_MS = parseInt(process.env.CHAIN_DELAY_MS, 10) || 400;

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function getBotEthereumAddress(bot) {
  const raw = bot.walletEthereum || bot.walletAddress || '';
  return raw && String(raw).trim() ? String(raw).trim() : null;
}

setInterval(async () => {
  try {
    const running = getRunningConfigs();
    if (running.length === 0) return;
    for (const b of running) {
      const ethAddr = getBotEthereumAddress(b);
      if (ethAddr) {
        try {
          await refreshWallet(ethAddr);
        } catch (e) {
          console.warn('[Bot refresh ETH]', ethAddr, e.message);
        }
        await delay(CHAIN_DELAY_MS);
      }
    }
  } catch (e) {
    console.warn('[Bot refresh ETH loop]', e.message);
  }
}, ETH_REFRESH_INTERVAL_MS);
console.log(`Bot monitor: Ethereum every ${ETH_REFRESH_INTERVAL_MS / 1000}s`);

// Re-fetch all wallets at interval from .env (minutes)
const intervalMinutes = parseInt(process.env.FETCH_INTERVAL_MINUTES, 10) || 30;
if (intervalMinutes > 0) {
  const cronExpr = `*/${intervalMinutes} * * * *`;
  cron.schedule(cronExpr, async () => {
    console.log(`[Cron] Refreshing all wallets (every ${intervalMinutes} min)`);
    try {
      const results = await refreshAllWallets();
      console.log('[Cron] Refresh done:', results.length, 'wallets');
    } catch (e) {
      console.error('[Cron] Refresh error:', e.message);
    }
  });
  console.log(`Scheduler: refresh every ${intervalMinutes} minutes`);
}
