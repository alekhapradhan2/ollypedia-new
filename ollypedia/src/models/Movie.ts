import mongoose, { Schema, model, models } from "mongoose";
import "./Production"; // Register Production model

const ReviewSchema = new Schema({
  user:    { type: String, default: "Anonymous" },
  rating:  Number,
  text:    String,
  date:    String,
  likes:   { type: Number, default: 0 },
  replies: [{ user: String, text: String, date: String }],
});

const SongSchema = new Schema({
  title:         { type: String, default: "" },
  singer:        { type: String, default: "" },
  singerRef:     [{ type: Schema.Types.ObjectId, ref: "Cast" }],
  musicDirector: { type: String, default: "" },
  lyricist:      { type: String, default: "" },
  ytId:          { type: String, default: "" },
  url:           { type: String, default: "" },
  thumbnailUrl:  { type: String, default: "" },
  lyrics:        { type: String, default: "" },
  description:   { type: String, default: "" },
});

const CastEntrySchema = new Schema(
  {
    castId: { type: Schema.Types.ObjectId, ref: "Cast", required: true },
    name:   { type: String, default: "" },
    photo:  { type: String, default: "" },
    type:   { type: String, default: "Actor" },
    role:   { type: String, default: "" },
  },
  { _id: false }
);

const MovieSchema = new Schema(
  {
    title:         { type: String, required: true, trim: true },
    category:      { type: String, default: "Feature Film" },
    genre:         [{ type: String }],
    releaseDate:   { type: String, default: "" },
    releaseTBA:    { type: Boolean, default: false },
    director:      { type: String, default: "" },
    producer:      { type: String, default: "" },
    budget:        { type: String, default: "" },
    language:      { type: String, default: "Odia" },
    synopsis:      { type: String, default: "" },
    story:         { type: String, default: "" },         // long-form story (SEO)
    review:        { type: String, default: "" },         // editorial review (SEO)
    posterUrl:     { type: String, default: "" },
    thumbnailUrl:  { type: String, default: "" },
    bannerUrl:     { type: String, default: "" },
    runtime:       { type: String, default: "" },
    imdbId:        { type: String, default: "" },
    imdbRating:    { type: String, default: "" },
    imdbVotes:     { type: String, default: "" },
    contentRating: { type: String, default: "" },
    productionId:  { type: Schema.Types.ObjectId, ref: "Production" },
    collaborators: [{ type: Schema.Types.ObjectId, ref: "Production" }],
    cast:          [CastEntrySchema],
    media: {
      trailer: { ytId: String, url: String, thumbnailUrl: String },
      songs:   [SongSchema],
    },
    boxOffice: {
      opening:   { type: String, default: "TBA" },
      firstWeek: { type: String, default: "TBA" },
      total:     { type: String, default: "TBA" },
    },
    verdict:       { type: String, default: "Upcoming" },
    status:        { type: String, default: "Upcoming" },
    reviews:       [ReviewSchema],
    news:          [{ type: Schema.Types.ObjectId, ref: "News" }],
    slug:          { type: String, default: "", index: true },
    interestedYes: { type: Number, default: 0 },
    interestedNo:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Movie = models.Movie || model("Movie", MovieSchema);
export default Movie;
