// 📁 File: models/managerModel.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const managerSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicUrl: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Blocked"], default: "Active" },
    role: {
      type: String,
      enum: ["Admin", "Manager"],
      required: true,
      default: "Manager",
    },
    blockedAt: { type: Date },
    blockedBy: { type: String },
  },
  { timestamps: true }
);

managerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

managerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Manager = mongoose.model("Manager", managerSchema);

export default Manager;
