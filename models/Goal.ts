import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  kind: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: Date;
  notes?: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema: Schema<IGoal> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    kind: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, required: true, min: 0, default: 0 },
    targetDate: { type: Date, required: true },
    notes: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, completed: 1, createdAt: -1 });

const Goal: Model<IGoal> = mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);

export default Goal;