import mongoose, { Schema, model, models } from "mongoose";

export interface ICommunityActivity {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  movieId?: mongoose.Types.ObjectId;
  type:
    | "REGISTER"
    | "VOTE_MOVIE"
    | "CHANGE_VOTE"
    | "CREATE_THREAD"
    | "CREATE_COMMENT"
    | "CREATE_REPLY"
    | "LIKE_COMMENT";
  referenceId?: mongoose.Types.ObjectId;
  metadata?: {
    movieTitle?: string;
    movieSlug?: string;
    threadTitle?: string;
    threadSlug?: string;
    voteType?: string;
    snippet?: string;
  };
  createdAt: Date;
}

const CommunityActivitySchema = new Schema<ICommunityActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "CommunityUser",
      required: true,
      index: true,
    },
    movieId: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    metadata: {
      movieTitle: String,
      movieSlug: String,
      threadTitle: String,
      threadSlug: String,
      voteType: String,
      snippet: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

CommunityActivitySchema.index({ userId: 1, createdAt: -1 });
CommunityActivitySchema.index({ movieId: 1, createdAt: -1 });

export const CommunityActivity =
  models.CommunityActivity ||
  model<ICommunityActivity>("CommunityActivity", CommunityActivitySchema);

export default CommunityActivity;
