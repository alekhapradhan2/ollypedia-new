import mongoose, { Schema, model, models } from "mongoose";

export interface ICommentReport extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  reportedUserId?: mongoose.Types.ObjectId;
  movieId?: mongoose.Types.ObjectId;
  threadId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  reason:
    | "spam"
    | "abuse"
    | "hate_speech"
    | "harassment"
    | "spoiler"
    | "misleading"
    | "other";
  details?: string;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  createdAt: Date;
  updatedAt: Date;
}

const CommentReportSchema = new Schema<ICommentReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      index: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
    },
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionThread",
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "DiscussionComment",
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "abuse",
        "hate_speech",
        "harassment",
        "spoiler",
        "misleading",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "action_taken"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

CommentReportSchema.index({ status: 1, createdAt: -1 });

export const CommentReport =
  models.CommentReport ||
  model<ICommentReport>("CommentReport", CommentReportSchema);

export default CommentReport;
