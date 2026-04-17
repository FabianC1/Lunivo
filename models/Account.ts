// Account model

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isArchived: boolean;
  syncStatus: 'manual' | 'synced';
  provider?: string;
  providerAccountId?: string;
  providerConnectionId?: mongoose.Types.ObjectId;
  lastSyncedAt?: Date;
}

const AccountSchema: Schema<IAccount> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true, default: 'checking' },
    balance: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: 'GBP', uppercase: true, trim: true },
    isArchived: { type: Boolean, default: false },
    syncStatus: { type: String, enum: ['manual', 'synced'], default: 'manual', index: true },
    provider: { type: String, trim: true },
    providerAccountId: { type: String, trim: true },
    providerConnectionId: { type: Schema.Types.ObjectId, ref: 'BankConnection' },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, name: 1 }, { unique: true });
AccountSchema.index({ userId: 1, provider: 1, providerAccountId: 1 }, { unique: true, sparse: true });

const Account: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);

export default Account;
