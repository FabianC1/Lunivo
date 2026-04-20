// Transaction model

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  kind: 'income' | 'expense';
  category: string;
  description?: string;
  tags?: string[];
  source?: 'manual' | 'bank-sync';
  provider?: string;
  providerTransactionId?: string;
  providerConnectionId?: mongoose.Types.ObjectId;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    kind: {
      type: String,
      enum: ['income', 'expense'],
      default: 'expense',
      required: true,
      index: true,
    },
    category: { type: String, required: true },
    description: { type: String },
    tags: { type: [String], default: [] },
    source: { type: String, enum: ['manual', 'bank-sync'], default: 'manual' },
    provider: { type: String, trim: true },
    providerTransactionId: { type: String, trim: true },
    providerConnectionId: { type: Schema.Types.ObjectId, ref: 'BankConnection' },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, kind: 1, date: -1 });
TransactionSchema.index({ userId: 1, provider: 1, providerTransactionId: 1 }, { unique: true, sparse: true });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
