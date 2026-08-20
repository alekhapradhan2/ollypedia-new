import mongoose, { Schema, model, models } from "mongoose";

export interface ICommentLike {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommentLikeSchema = new Schema<ICommentLike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionComment",
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

CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

export const CommentLike =
  models.CommentLike || model<ICommentLike>("CommentLike", CommentLikeSchema);

export default CommentLike;
