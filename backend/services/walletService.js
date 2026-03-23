import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { getWebhookForWallet } from './runningBotsStore.js';
import { fetchAndParseAllTransactions } from './etherscanParser.js';
import { sendTransactionAlertsBatch } from './discordService.js';

export async function saveTransactions(transactions, normalized, walletType = 'Ethereum') {
  const nativeToken = 'ETH';
  const tokenVal = (tx) => (tx.txType === 'token' ? (tx.token != null && tx.token !== '' ? String(tx.token).trim() : '') : (tx.token || nativeToken));

  const withKey = [];
  for (const tx of transactions) {
    const hash = String(tx.transactionHash || '').trim();
    if (!hash) continue;
    const token = tokenVal(tx);
    withKey.push({ tx, hash, token, key: `${hash}|${normalized}|${token}` });
  }
  if (withKey.length === 0) return { newCount: 0, newTransactions: [] };

  const filters = withKey.map(({ hash, token }) => ({ transactionHash: hash, walletAddress: normalized, token }));
  const existing = await Transaction.find({ $or: filters }).select('transactionHash walletAddress token').lean();
  const existingSet = new Set(existing.map((e) => `${e.transactionHash}|${e.walletAddress}|${e.token}`));

  const toInsert = withKey.filter(({ key }) => !existingSet.has(key));
  if (toInsert.length === 0) return { newCount: 0, newTransactions: [] };

  const docs = toInsert.map(({ tx, hash, token }) => {
    const txType = tx.txType === 'token' ? 'token' : (tx.txType && tx.txType !== 'eth' ? tx.txType : 'eth');
    const walletTypeStr = String(tx.walletType || walletType).trim() || 'Ethereum';
    return {
      transactionHash: hash,
      walletAddress: normalized,
      walletType: walletTypeStr,
      txType,
      token,
      method: String(tx.method || '').trim(),
      block: String(tx.block || '').trim(),
      age: String(tx.age || '').trim(),
      from: String(tx.from || '').trim(),
      to: String(tx.to || '').trim(),
      inOut: String(tx.inOut || '').trim(),
      amount: String(tx.amount || '').trim(),
      amountUsd: String(tx.amountUsd != null ? tx.amountUsd : '').trim(),
      txnFee: String(tx.txnFee != null ? tx.txnFee : '').trim(),
    };
  });

  let insertedCount = docs.length;
  let failedIndices = new Set();
  try {
    await Transaction.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err.code === 11000 && err.writeErrors && err.result) {
      failedIndices = new Set(err.writeErrors.map((we) => we.index));
      insertedCount = err.result.insertedCount ?? (err.result.insertedIds ? Object.keys(err.result.insertedIds).length : 0);
      if (insertedCount === 0) throw err;
    } else {
      throw err;
    }
  }

  const newTransactions = toInsert
    .filter((_, i) => !failedIndices.has(i))
    .map(({ tx }) => ({ ...tx, walletType: String(tx.walletType || walletType).trim() || 'Ethereum' }));
  return { newCount: insertedCount, newTransactions };
}

export async function notifyDiscordNewTransactions(normalized, walletType, newTransactions) {
  if (!newTransactions || newTransactions.length === 0) return;
  const webhookUrl = getWebhookForWallet(walletType, normalized);
  if (!webhookUrl) return;
  try {
    await sendTransactionAlertsBatch(webhookUrl, newTransactions);
  } catch (e) {
    console.warn('[Discord alert]', webhookUrl.slice(0, 50) + '...', e.message);
  }
}

export async function addOrUpdateWallet(address, options = {}) {
  const { forceRefresh = false } = options;
  const normalized = address.trim().toLowerCase();
  if (!normalized.startsWith('0x') || normalized.length < 40) {
    throw new Error('Invalid address (expected 0x...)');
  }

  const existingWallet = await Wallet.findOne({ address: normalized });
  if (existingWallet && !forceRefresh) {
    return getWalletWithTransactions(normalized);
  }

  const { ethBalance, ethValue, transactions, tokenTransactions = [] } = await fetchAndParseAllTransactions(normalized);

  let wallet = existingWallet || new Wallet({ address: normalized });
  wallet.ethBalance = ethBalance;
  wallet.ethValue = ethValue;
  wallet.lastFetched = new Date();
  await wallet.save();

  const r1 = await saveTransactions(transactions, normalized, 'Ethereum');
  const r2 = await saveTransactions(tokenTransactions, normalized, 'Ethereum');
  const allNew = [...(r1.newTransactions || []), ...(r2.newTransactions || [])];
  if (allNew.length > 0) {
    await notifyDiscordNewTransactions(normalized, 'Ethereum', allNew);
    wallet.lastFetched = new Date();
    await wallet.save();
  }
  return getWalletWithTransactions(normalized);
}

export async function getWalletWithTransactions(address) {
  const normalized = (address || '').trim().toLowerCase();
  const wallet = await Wallet.findOne({ address: normalized });
  if (!wallet) return null;
  const transactions = await Transaction.find({ walletAddress: normalized, walletType: 'Ethereum' })
    .sort({ createdAt: -1 })
    .lean();
  const obj = wallet.toObject();
  return { ...obj, ethBalance: obj.ethBalance ?? '', ethValue: obj.ethValue ?? '', transactions };
}

export async function getAllWallets() {
  const wallets = await Wallet.find().sort({ lastFetched: -1 }).lean();
  return wallets;
}

export async function refreshWallet(address) {
  return addOrUpdateWallet(address, { forceRefresh: true });
}

export async function refreshAllWallets() {
  const wallets = await Wallet.find().select('address').lean();
  const results = [];
  for (const w of wallets) {
    try {
      const result = await addOrUpdateWallet(w.address, { forceRefresh: true });
      results.push({ address: w.address, ok: true, result });
    } catch (err) {
      results.push({ address: w.address, ok: false, error: err.message });
    }
  }
  return results;
}
