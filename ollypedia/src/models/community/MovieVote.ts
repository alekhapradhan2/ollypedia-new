import mongoose, { Schema, model, models } from "mongoose";

export type VoteType = "skip" | "timepass" | "go_for_it" | "perfection";

export interface IMovieVote extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  voteType: VoteType;
  createdAt: Date;
  updatedAt: Date;
}

const MovieVoteSchema = new Schema<IMovieVote>(
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
      required: true,
      index: true,
    },
    voteType: {
      type: String,
      enum: ["skip", "timepass", "go_for_it", "perfection"],
      required: true,
    },
  },
  { timestamps: true }
);

// Strictly ONE vote per user per movie. Unique compound index:
MovieVoteSchema.index({ userId: 1, movieId: 1 }, { unique: true });
MovieVoteSchema.index({ movieId: 1, voteType: 1 });
MovieVoteSchema.index({ createdAt: -1 });

export const MovieVote =
  models.MovieVote || model<IMovieVote>("MovieVote", MovieVoteSchema);

export default MovieVote;
