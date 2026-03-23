/**
 * In-memory store for running bots. Data is loaded from DB only when user clicks RUN.
 * Used for: refresh loop (get transactions) and Discord alerts (webhook URL).
 * Edit bot → stop bot and remove from RAM. RUN → load from DB into RAM.
 * Ethereum only.
 */

const runningByBotId = new Map();
const webhookByWalletKey = new Map();

function walletKey(address) {
  if (!address) return null;
  return `Ethereum:${String(address).trim().toLowerCase()}`;
}

function clearWebhooksForBot(config) {
  const addr = config.walletEthereum || config.walletAddress;
  if (addr) {
    const key = walletKey(addr);
    if (key) webhookByWalletKey.delete(key);
  }
}

/**
 * Add bot to running set. Call when user clicks RUN. Bot should be from DB (lean).
 */
export function addBotToRunning(bot) {
  const id = bot._id?.toString();
  if (!id) return;
  const config = {
    _id: bot._id,
    walletEthereum: (bot.walletEthereum || '').trim() || (bot.walletAddress || '').trim(),
    walletAddress: (bot.walletAddress || '').trim(),
    discordWebhookUrl: (bot.discordWebhookUrl || '').trim(),
  };
  removeBotFromRunning(id);
  runningByBotId.set(id, config);
  const webhook = config.discordWebhookUrl;
  if (webhook && config.walletEthereum) {
    webhookByWalletKey.set(walletKey(config.walletEthereum), webhook);
  }
}

/**
 * Remove bot from running set. Call on STOP or EDIT or DELETE.
 */
export function removeBotFromRunning(botId) {
  const id = botId?.toString();
  if (!id) return;
  const config = runningByBotId.get(id);
  if (config) {
    clearWebhooksForBot(config);
    runningByBotId.delete(id);
  }
}

/**
 * Get all running bot configs for the refresh loop (no DB read).
 */
export function getRunningConfigs() {
  return Array.from(runningByBotId.values());
}

/**
 * Get Discord webhook URL for a wallet (from RAM). Used when sending alerts.
 */
export function getWebhookForWallet(walletType, normalizedAddress) {
  if (!normalizedAddress) return null;
  const key = walletKey(normalizedAddress);
  return key ? webhookByWalletKey.get(key) || null : null;
}
