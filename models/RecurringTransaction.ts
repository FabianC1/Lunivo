import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecurringTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  description: string;
  category: string;
  amount: number;
  kind: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextOccurrence: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecurringTransactionSchema: Schema<IRecurringTransaction> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    kind: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
      index: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    nextOccurrence: { type: Date, required: true, index: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RecurringTransactionSchema.index({ userId: 1, enabled: 1, nextOccurrence: 1 });
RecurringTransactionSchema.index({ userId: 1, kind: 1, frequency: 1 });

const RecurringTransaction: Model<IRecurringTransaction> =
  mongoose.models.RecurringTransaction ||
  mongoose.model<IRecurringTransaction>('RecurringTransaction', RecurringTransactionSchema);

export default RecurringTransaction;
