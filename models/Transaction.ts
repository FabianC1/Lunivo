// Transaction model

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  kind: 'income' | 'expense';
  category: string;
  description?: string;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, kind: 1, date: -1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
