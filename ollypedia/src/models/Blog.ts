import { Schema, model, models } from "mongoose";

const ReviewSchema = new Schema({
  user:   { type: String, default: "Anonymous" },
  rating: Number,
  text:   String,
  date:   String,
  likes:  { type: Number, default: 0 },
});

const BlogSchema = new Schema(
  {
    title:      { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, trim: true },
    excerpt:    { type: String, default: "" },
    content:    { type: String, required: true },
    category:   { type: String, default: "General" },
    tags:       [{ type: String }],
    coverImage: { type: String, default: "" },
    movieId:    { type: Schema.Types.ObjectId, ref: "Movie" },
    movieTitle: { type: String, default: "" },
    author:     { type: String, default: "Ollypedia Team" },
    published:  { type: Boolean, default: false },
    featured:   { type: Boolean, default: false },
    views:      { type: Number, default: 0 },
    readTime:   { type: Number, default: 5 },
    seoTitle:   { type: String, default: "" },
    seoDesc:    { type: String, default: "" },
    reviews:    [ReviewSchema],
  },
  { timestamps: true }
);

export const Blog = models.Blog || model("Blog", BlogSchema);
export default Blog;
