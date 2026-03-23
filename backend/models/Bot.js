import mongoose from 'mongoose';

const botSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isRunning: { type: Boolean, default: false },
  walletEthereum: { type: String, trim: true, default: '' },
  walletAddress: { type: String, trim: true, default: '' }, // legacy alias for walletEthereum
  discordWebhookUrl: { type: String, trim: true, default: '' },
}, { timestamps: true });

export default mongoose.model('Bot', botSchema);
