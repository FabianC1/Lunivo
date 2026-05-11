import mongoose, { Schema, Document, Model } from 'mongoose';

export type EventType =
  | 'Wedding'
  | 'Holiday'
  | 'Home'
  | 'Education'
  | 'Vehicle'
  | 'Emergency Fund'
  | 'Birthday'
  | 'Other';

export type LocationTier = 'budget' | 'local' | 'destination' | 'luxury';

export interface IMilestone {
  id: string;
  label: string;
  date: string;
  amount: number;
  paid: boolean;
}

export interface IScenario {
  id: string;
  name: string;
  guestCount: number;
  locationTier: string;
  costs: Record<string, number>;
  contingencyPercent: number;
  budgetTarget: number;
  createdAt: string;
}

export interface IEvent extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: EventType;
  eventDate: string;
  guestCount: number;
  locationTier: LocationTier;
  currentSavings: number;
  monthlyIncome: number;
  monthlyCommitments: number;
  budgetTarget: number;
  contingencyPercent: number;
  costs: Map<string, number>;
  milestones: IMilestone[];
  scenarios: IScenario[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    paid: { type: Boolean, default: false },
  },
  { _id: false }
);

const ScenarioSchema = new Schema<IScenario>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    guestCount: { type: Number, default: 0 },
    locationTier: { type: String, default: 'local' },
    costs: { type: Map, of: Number, default: {} },
    contingencyPercent: { type: Number, default: 10 },
    budgetTarget: { type: Number, default: 0 },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const EventSchema: Schema<IEvent> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Wedding', 'Holiday', 'Home', 'Education', 'Vehicle', 'Emergency Fund', 'Birthday', 'Other'],
      required: true,
    },
    eventDate: { type: String, default: '' },
    guestCount: { type: Number, default: 0 },
    locationTier: {
      type: String,
      enum: ['budget', 'local', 'destination', 'luxury'],
      default: 'local',
    },
    currentSavings: { type: Number, default: 0 },
    monthlyIncome: { type: Number, default: 0 },
    monthlyCommitments: { type: Number, default: 0 },
    budgetTarget: { type: Number, default: 0 },
    contingencyPercent: { type: Number, default: 10 },
    costs: { type: Map, of: Number, default: {} },
    milestones: { type: [MilestoneSchema], default: [] },
    scenarios: { type: [ScenarioSchema], default: [] },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

EventSchema.index({ userId: 1, createdAt: -1 });

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
