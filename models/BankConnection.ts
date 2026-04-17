import mongoose, { Document, Model, Schema } from "mongoose";

export type BankConnectionStatus = "pending" | "authorizing" | "authorized" | "syncing" | "failed";
export type BankSyncStatus = "success" | "failed";

export interface IBankConnection extends Document {
  userId: mongoose.Types.ObjectId;
  provider: "yapily";
  applicationUserId: string;
  institutionId: string;
  institutionCountryCode: string;
  status: BankConnectionStatus;
  consentRequestId?: string;
  consentId?: string;
  consentToken?: string;
  authToken?: string;
  hostedUrl?: string;
  redirectUrl?: string;
  callbackState?: string;
  lastError?: string;
  authorizationExpiresAt?: Date;
  connectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncStatus?: BankSyncStatus;
  lastSyncAccountCount?: number;
  lastSyncTransactionCount?: number;
}

const BankConnectionSchema: Schema<IBankConnection> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["yapily"], default: "yapily", required: true },
    applicationUserId: { type: String, required: true, trim: true },
    institutionId: { type: String, required: true, trim: true },
    institutionCountryCode: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ["pending", "authorizing", "authorized", "syncing", "failed"], default: "pending", required: true },
    consentRequestId: { type: String, trim: true },
    consentId: { type: String, trim: true },
    consentToken: { type: String, trim: true },
    authToken: { type: String, trim: true },
    hostedUrl: { type: String, trim: true },
    redirectUrl: { type: String, trim: true },
    callbackState: { type: String, trim: true },
    lastError: { type: String, trim: true },
    authorizationExpiresAt: { type: Date },
    connectedAt: { type: Date },
    lastSyncAt: { type: Date },
    lastSyncStatus: { type: String, enum: ["success", "failed"] },
    lastSyncAccountCount: { type: Number, default: 0 },
    lastSyncTransactionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BankConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

const BankConnection: Model<IBankConnection> =
  mongoose.models.BankConnection || mongoose.model<IBankConnection>("BankConnection", BankConnectionSchema);

export default BankConnection;