import { Schema } from "mongoose";
import mongoose from "mongoose";
const UserSchema = new Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String, default: null },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
