import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const nomineeSchema = mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  percentage: { type: Number, required: true, min: 1, max: 100 },
});

const memberSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    volunteerCode: { type: String },
    panNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    address: {
      houseNumber: { type: String },
      street: { type: String },
      cityVillage: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    employment: {
      type: { type: String },
      department: { type: String },
      companyName: { type: String },
      contributionPlan: { type: String },
    },
    nominees: [nomineeSchema],
    membershipStatus: {
      type: String,
      enum: ["Pending", "Active", "Blocked", "Inactive"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    registrationNo: { type: String, unique: true, sparse: true },
    profileImageUrl: {
      type: String,
      default: "",
    },
    panImageUrl: {
      type: String,
      default: "",
    },
    verifiedByAdmin: { type: Boolean, default: false },
    adminNotes: { type: String },
    appointmentLetterUrl: { type: String },
    idCardUrl: { type: String },
    receiptUrl: { type: String },
    blockedAt: {
      type: Date,
    },

    // --- THIS IS THE CORRECTED FIELD ---
    // Instead of an ObjectId with a broken reference, we store the admin's identifier as a string.
    blockedBy: {
      type: String,
      // The 'ref' property has been removed.
    },
  },
  { timestamps: true }
);

memberSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

memberSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Member = mongoose.model("Member", memberSchema);

export default Member;
