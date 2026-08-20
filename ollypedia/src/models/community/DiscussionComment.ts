import mongoose, { Schema, model, models } from "mongoose";

export interface IDiscussionComment extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  threadId?: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  parentCommentId?: mongoose.Types.ObjectId | null;
  content: string;
  hasSpoiler: boolean;
  status: "active" | "hidden" | "deleted" | "reported";
  likeCount: number;
  replyCount: number;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionCommentSchema = new Schema<IDiscussionComment>(
  {
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionThread",
      required: false,
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionComment",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    hasSpoiler: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "hidden", "deleted", "reported"],
      default: "active",
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

DiscussionCommentSchema.index({ movieId: 1, threadId: 1, parentCommentId: 1 });
DiscussionCommentSchema.index({ threadId: 1, likeCount: -1 });
DiscussionCommentSchema.index({ userId: 1, createdAt: -1 });

// Ensure hot reloading in Next.js development picks up schema updates
if (models.DiscussionComment) {
  delete (models as any).DiscussionComment;
}

export const DiscussionComment =
  model<IDiscussionComment>("DiscussionComment", DiscussionCommentSchema);

export default DiscussionComment;
