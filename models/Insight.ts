import mongoose, { Schema, Document, Model } from 'mongoose';

export type InsightType = 'anomaly' | 'forecast' | 'opportunity' | 'milestone' | 'event-alert';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface IInsight extends Document {
  userId: mongoose.Types.ObjectId;
  type: InsightType;
  category?: string;
  message: string;
  metadata?: Record<string, any>;
  priority: InsightPriority;
  dismissedAt?: Date;
  actionTaken: boolean;
  actionTakenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InsightSchema: Schema<IInsight> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['anomaly', 'forecast', 'opportunity', 'milestone', 'event-alert'],
      required: true,
      index: true,
    },
    category: { type: String },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    dismissedAt: { type: Date },
    actionTaken: { type: Boolean, default: false },
    actionTakenAt: { type: Date },
  },
  { timestamps: true }
);

InsightSchema.index({ userId: 1, dismissedAt: 1, createdAt: -1 });
InsightSchema.index({ userId: 1, type: 1, priority: -1, createdAt: -1 });

const Insight: Model<IInsight> =
  mongoose.models.Insight || mongoose.model<IInsight>('Insight', InsightSchema);

export default Insight;
