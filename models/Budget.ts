// Budget model

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  total: number;
  period: string; // e.g. 'monthly'
}

const BudgetSchema: Schema<IBudget> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    total: { type: Number, required: true },
    period: { type: String, default: 'monthly' },
  },
  { timestamps: true }
);

const Budget: Model<IBudget> =
  mongoose.models.Budget || mongoose.model<IBudget>('Budget', BudgetSchema);

export default Budget;
