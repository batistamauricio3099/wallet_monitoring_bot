import axios from 'axios';

/**
 * Discord alerts for Ethereum transactions only.
 */

const IN_ICON = '📥';
const OUT_ICON = '📤';

function formatTimeIST(ageStrOrTs) {
  let d = new Date();
  if (ageStrOrTs != null && typeof ageStrOrTs === 'number') {
    d = new Date(ageStrOrTs * 1000);
  } else if (typeof ageStrOrTs === 'string') {
    const trimmed = ageStrOrTs.trim().replace(/\s+(\d{1,2}):(\d{2}):(\d{2})$/, 'T$1:$2:$3Z');
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) d = parsed;
  }
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' (IST)';
}

function buildEmbedEthereum(tx) {
  const chainName = 'Ethereum';
  const chainIcon = '💎';
  const tokenName = (tx.token && String(tx.token).trim()) || 'ETH';
  const txUrl = `https://etherscan.io/tx/${tx.transactionHash || ''}`;
  const isIn = (tx.inOut || '').toUpperCase() === 'IN';
  const isOut = (tx.inOut || '').toUpperCase() === 'OUT';
  const flowIcon = isIn ? IN_ICON : isOut ? OUT_ICON : '↔️';
  const typeText = isIn ? 'Incoming' : isOut ? 'Outgoing' : 'Transfer';
  const amountVal = tx.amount || '—';
  const usdVal = tx.amountUsd || '—';
  const timeVal = tx.age ? formatTimeIST(tx.age) : '—';
  const blockVal = (tx.block && String(tx.block).trim()) || '—';
  const title = `${chainIcon} ${chainName} · ${flowIcon} ${typeText}`;
  const description = [
    `${flowIcon} Type: ${typeText}`,
    `🏛️ Asset: ${chainIcon} ${chainName} (${tokenName})`,
    `🔢 Amount: ${amountVal}`,
    `💲 USD Value: ${usdVal}`,
    `🕒 Time: ${timeVal}`,
    `📦 Block: ${blockVal}`,
    `✅ Status: Confirmed`,
    `🔗 Transaction: [View on Etherscan](${txUrl})`,
  ].join('\n');
  const color = 0x627EEA;
  return { title, description, color, footer: { text: `${chainIcon} ${tokenName} Transaction Monitor` }, timestamp: new Date().toISOString() };
}

const DISCORD_EMBEDS_PER_MESSAGE = 10;

export async function sendTransactionAlertsBatch(webhookUrl, txList) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !txList || txList.length === 0) return;
  const url = webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return;

  for (let i = 0; i < txList.length; i += DISCORD_EMBEDS_PER_MESSAGE) {
    const chunk = txList.slice(i, i + DISCORD_EMBEDS_PER_MESSAGE);
    const embeds = chunk.map((tx) => buildEmbedEthereum(tx));
    const body = { embeds };

    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Discord webhook ${res.status}: ${String(res.data || res.statusText).slice(0, 200)}`);
    }
  }
}

export async function sendTransactionAlert(webhookUrl, tx) {
  if (!webhookUrl || typeof webhookUrl !== 'string') return;
  const url = webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return;

  const embed = buildEmbedEthereum(tx);
  const body = { embeds: [embed] };

  const res = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Discord webhook ${res.status}: ${String(res.data || res.statusText).slice(0, 200)}`);
  }
}
