import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    profile: {
      age: { type: Number, default: 18 },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "male",
      },
      interests: { type: [String], default: ["sports", "arts"] },
      location: { type: String, default: "Cairo" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
