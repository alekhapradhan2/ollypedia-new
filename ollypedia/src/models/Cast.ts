import { Schema, model, models } from "mongoose";

const CastSchema = new Schema(
  {
    name:      { type: String, required: true, trim: true },
    type:      { type: String, default: "Actor" },
    roles:     [{ type: String }],
    bio:       { type: String, default: "" },
    photo:     { type: String, default: "" },
    dob:       { type: String, default: "" },
    gender:    { type: String, default: "" },
    location:  { type: String, default: "" },
    website:   { type: String, default: "" },
    instagram: { type: String, default: "" },
    banner:    { type: String, default: "" },
    movies:    [{ type: Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

export const Cast = models.Cast || model("Cast", CastSchema);
export default Cast;
