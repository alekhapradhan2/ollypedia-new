import { Schema, model, models } from "mongoose";

const NewsSchema = new Schema(
  {
    movieId:    { type: Schema.Types.ObjectId, ref: "Movie" },
    movieTitle: { type: String, default: "" },
    title:      { type: String, required: true },
    content:    { type: String, required: true },
    category:   { type: String, default: "Update" },
    imageUrl:   { type: String, default: "" },
    published:  { type: Boolean, default: true },
    sourceUrl:  { type: String, default: "" },
    ytId:       { type: String, default: "" },
    newsType:   { type: String, default: "article" },
  },
  { timestamps: true }
);

export const News = models.News || model("News", NewsSchema);
export default News;
