import express from 'express';
import * as walletService from '../services/walletService.js';

const router = express.Router();

// Add or update wallet (fetch from Etherscan and save)
router.post('/', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Address is required' });
    const result = await walletService.addOrUpdateWallet(address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add wallet' });
  }
});

// Get wallet with transactions (Ethereum only)
router.get('/:address', async (req, res) => {
  try {
    const data = await walletService.getWalletWithTransactions(req.params.address);
    if (!data) return res.status(404).json({ error: 'Wallet not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all wallets
router.get('/', async (req, res) => {
  try {
    const wallets = await walletService.getAllWallets();
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual refresh one wallet
router.post('/:address/refresh', async (req, res) => {
  try {
    const result = await walletService.refreshWallet(req.params.address);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
