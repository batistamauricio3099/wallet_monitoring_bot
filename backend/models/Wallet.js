import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  ethBalance: { type: String, default: '' },
  ethValue: { type: String, default: '' },
  lastFetched: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
