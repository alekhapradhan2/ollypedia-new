import { Schema, model, models } from "mongoose";

const ProductionSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    logo:        { type: String, default: "" },
    description: { type: String, default: "" },
    website:     { type: String, default: "" },
    movies:      [{ type: Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

export const Production = models.Production || model("Production", ProductionSchema);
export default Production;
