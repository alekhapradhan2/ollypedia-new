import mongoose, { Schema, model, models } from "mongoose";

export interface ICommunityUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatar: string;
  bio?: string;
  role: "user" | "moderator" | "admin";
  status: "active" | "suspended" | "deleted";
  joinedAt: Date;
  lastLoginAt?: Date;
  discussionCount: number;
  commentCount: number;
  voteCount: number;
  likesReceived: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommunityUserSchema = new Schema<ICommunityUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 300,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
    },
    discussionCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    likesReceived: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CommunityUserSchema.index({ status: 1 });
CommunityUserSchema.index({ role: 1 });

export const CommunityUser =
  models.CommunityUser || model<ICommunityUser>("CommunityUser", CommunityUserSchema);

export default CommunityUser;
