import { Schema, model, models } from "mongoose";

const ContactSchema = new Schema(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, default: "General Inquiry" },
    message: { type: String, required: true },
    read:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Contact = models.Contact || model("Contact", ContactSchema);
export default Contact;
