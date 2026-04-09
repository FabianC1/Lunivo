// User model

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_CUSTOM_CATEGORIES,
  DEFAULT_DASHBOARD_SETTINGS,
  type AppearanceSettings,
  type DashboardSettings,
  type ThemePreset,
} from '../lib/userSettings';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string; // hashed
  planSlug: 'free' | 'starter' | 'growth' | 'sync' | 'scale';
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
  appearance?: AppearanceSettings;
  dashboard?: DashboardSettings;
  customCategories?: string[];
  createdAt: Date;
}

const ThemePresetSchema = new Schema<ThemePreset>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['light', 'dark'], required: true },
    isCustom: { type: Boolean, default: true },
    colors: {
      bgColor: { type: String, required: true },
      textColor: { type: String, required: true },
      primaryColor: { type: String, required: true },
      accentColor: { type: String, required: true },
      highlightColor: { type: String, required: true },
      cardColor: { type: String, required: true },
      navbarColor: { type: String, required: true },
      navbarBorderGradient: { type: String, required: true },
      navbarTextColor: { type: String, required: true },
      bgGradient: { type: String, required: true },
      buttonGradientStart: { type: String, required: true },
      buttonGradientEnd: { type: String, required: true },
      foregroundRgb: { type: String, required: true },
      backgroundStartRgb: { type: String, required: true },
      backgroundEndRgb: { type: String, required: true },
    },
  },
  { _id: false }
);

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    planSlug: { type: String, enum: ['free', 'starter', 'growth', 'sync', 'scale'], default: 'free' },
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
    appearance: {
      selectedThemeId: { type: String, default: DEFAULT_APPEARANCE_SETTINGS.selectedThemeId },
      customThemes: { type: [ThemePresetSchema], default: DEFAULT_APPEARANCE_SETTINGS.customThemes },
    },
    dashboard: {
      visibleWidgets: {
        charts: { type: Boolean, default: DEFAULT_DASHBOARD_SETTINGS.visibleWidgets.charts },
        goals: { type: Boolean, default: DEFAULT_DASHBOARD_SETTINGS.visibleWidgets.goals },
        transactions: { type: Boolean, default: DEFAULT_DASHBOARD_SETTINGS.visibleWidgets.transactions },
      },
      widgetOrder: { type: [String], default: DEFAULT_DASHBOARD_SETTINGS.widgetOrder },
      defaultWidget: { type: String, default: DEFAULT_DASHBOARD_SETTINGS.defaultWidget },
    },
    customCategories: { type: [String], default: DEFAULT_CUSTOM_CATEGORIES },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
