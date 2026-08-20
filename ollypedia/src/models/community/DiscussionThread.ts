import mongoose, { Schema, model, models } from "mongoose";

export interface IDiscussionThread extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  slug: string;
  hasSpoiler: boolean;
  status: "active" | "hidden" | "deleted" | "moderated";
  viewCount: number;
  likeCount: number;
  commentCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionThreadSchema = new Schema<IDiscussionThread>(
  {
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 5000,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hasSpoiler: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "hidden", "deleted", "moderated"],
      default: "active",
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

DiscussionThreadSchema.index({ movieId: 1, status: 1, lastActivityAt: -1 });
DiscussionThreadSchema.index({ movieId: 1, status: 1, createdAt: -1 });
DiscussionThreadSchema.index({ movieId: 1, status: 1, likeCount: -1 });
DiscussionThreadSchema.index({ userId: 1, createdAt: -1 });

if (models.DiscussionThread) {
  delete (models as any).DiscussionThread;
}

export const DiscussionThread =
  model<IDiscussionThread>("DiscussionThread", DiscussionThreadSchema);

export default DiscussionThread;
