import mongoose, { Schema, model, models } from "mongoose";

export interface IThreadLike {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  threadId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ThreadLikeSchema = new Schema<IThreadLike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionThread",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

ThreadLikeSchema.index({ userId: 1, threadId: 1 }, { unique: true });

export const ThreadLike =
  models.ThreadLike || model<IThreadLike>("ThreadLike", ThreadLikeSchema);

export default ThreadLike;
