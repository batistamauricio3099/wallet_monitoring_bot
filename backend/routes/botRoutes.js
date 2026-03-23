import express from 'express';
import Bot from '../models/Bot.js';
import { addOrUpdateWallet } from '../services/walletService.js';
import { addBotToRunning, removeBotFromRunning } from '../services/runningBotsStore.js';

const router = express.Router();

function normalizeEthereum(addr) {
  const s = String(addr || '').trim().toLowerCase();
  return s.startsWith('0x') && s.length >= 40 ? s : null;
}

function trimAddr(addr) {
  return String(addr || '').trim() || null;
}

function getEthereumAddress(bot) {
  const raw = bot.walletEthereum || bot.walletAddress || '';
  return normalizeEthereum(raw) || (raw ? raw.trim() : null);
}

router.get('/', async (req, res) => {
  try {
    const bots = await Bot.find().sort({ updatedAt: -1 }).lean();
    res.json(bots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, discordWebhookUrl, walletEthereum } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Bot name is required' });
    }
    const doc = {
      name: String(name).trim(),
      walletEthereum: trimAddr(walletEthereum) || '',
      discordWebhookUrl: typeof discordWebhookUrl === 'string' ? discordWebhookUrl.trim() : '',
    };
    const bot = new Bot(doc);
    await bot.save();
    const ethAddr = getEthereumAddress(bot);
    if (ethAddr) await addOrUpdateWallet(ethAddr).catch(() => {});
    res.status(201).json(bot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, discordWebhookUrl, walletEthereum } = req.body || {};
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    if (name != null) bot.name = String(name).trim();
    if (discordWebhookUrl !== undefined) bot.discordWebhookUrl = typeof discordWebhookUrl === 'string' ? discordWebhookUrl.trim() : '';
    if (walletEthereum != null) bot.walletEthereum = trimAddr(walletEthereum) || '';
    removeBotFromRunning(bot._id);
    bot.isRunning = false;
    await bot.save();
    const ethAddr = getEthereumAddress(bot);
    if (ethAddr) await addOrUpdateWallet(ethAddr).catch(() => {});
    res.json(await Bot.findById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    removeBotFromRunning(bot._id);
    await Bot.findByIdAndDelete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id).lean();
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    addBotToRunning(bot);
    await Bot.findByIdAndUpdate(req.params.id, { isRunning: true });
    res.json(await Bot.findById(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    removeBotFromRunning(bot._id);
    bot.isRunning = false;
    await bot.save();
    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
export { getEthereumAddress };
