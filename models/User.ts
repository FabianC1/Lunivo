// User model

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // hashed
  backupEmail?: string;
  phone?: string;
  preferences?: {
    language: string;
    currency: string;
    country: string;
  };
  notifications?: {
    emailNotifications: boolean;
    budgetAlerts: boolean;
    weeklyDigest: boolean;
  };
  createdAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    backupEmail: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    preferences: {
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'GBP' },
      country: { type: String, default: '' },
    },
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      budgetAlerts: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
